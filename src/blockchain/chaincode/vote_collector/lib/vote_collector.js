'use strict';

const { Contract } = require('fabric-contract-api');
const SEAL = require('node-seal');
const fs = require('fs');

const VotingStageEnum = Object.freeze({ "CLOSED": 0, "ONGOING": 1, "ENDED": 2 })

class VoteCollectorContract extends Contract {
    constructor() {
        super('VoteCollector');
        // await ctx.stub.putState("stage", VotingStageEnum.CLOSED);
    }

    async instantiate(ctx) {
        await ctx.stub.putState("stage", VotingStageEnum.ONGOING);
    }

    async initHEContext() {
        const seal = await SEAL();
        const schemeType = seal.SchemeType.bfv;         // Homomorphic Encryption (HE) Scheme
        const securityLevel = seal.SecurityLevel.tc128; // AES 128, could switch to AES 256 which can still provide AES 128 safety under large quantum computer attacks
        const polyModulusDegree = 2**12;                // Polynomial coefficient modulus m
        const bitSizes = [36, 36, 37];                  // Chain of prime sizes
        const bitSize = 32;                             // Plaintext modulus bit size

        let encParms = seal.EncryptionParameters(schemeType);
        let missingKeys = false;
        if (fs.existsSync("../../../voting_machine/keys/he/encryption.parameters")) {
            // File exists
            const encParmsData = fs.readFileSync("../../../voting_machine/keys/he/encryption.parameters", 'utf8');
            // encParms.delete();
            encParms.load(encParmsData);
        } else {
            // File does not exist

            // Set the PolyModulusDegree
            encParms.setPolyModulusDegree(polyModulusDegree);
            // Create a suitable set of CoeffModulus primes
            const coefs = seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes))
            encParms.setCoeffModulus(
                coefs
            );
            coefs.delete();
            // Set the PlainModulus to a prime of bitSize 32.
            const modulus = seal.PlainModulus.Batching(polyModulusDegree, bitSize);
            encParms.setPlainModulus(modulus);
            modulus.delete();

            // fs.writeFileSync("../../../voting_machine/keys/he/encryption.parameters", encParms.save());
            missingKeys = true;
        }

        // Create a new Context
        const context = seal.Context(
            encParms,       // Encryption Parameters
            true,           // ExpandModChain
            securityLevel   // Enforce a security level
        );

        if (!context.parametersSet()) {
            throw new Error(
                'Could not set the parameters in the given context. Please try different encryption parameters.'
            );
        }

        if (missingKeys) {
            const keyGenerator = seal.KeyGenerator(context);
            const secretKey = keyGenerator.secretKey();
            const publicKey = keyGenerator.createPublicKey();

            fs.writeFileSync("../../../voting_machine/keys/he/pub.key", publicKey.save());
            fs.writeFileSync("../../../voting_machine/keys/he/sec.key", secretKey.save());
            fs.writeFileSync("../../../voting_machine/keys/he/encryption.parameters", encParms.save());

            publicKey.delete();
            secretKey.delete();
            keyGenerator.delete();
        }

        encParms.delete();

        return [seal, context];
    }

    /**
     * Add vote to vote tally.
     * @param {Context} ctx - Context (implicit)
     * @param {string} vote - Base64 encoding of homomorphically encrypted vote
     */
    async submitVote(ctx, vote) {
        let stage = await ctx.stub.getState("stage");
        if (stage !== VotingStageEnum.ONGOING) {
            throw new Error("voting is not ongoing");
        }

        // TODO: validations

        let previous_vote_tally_b64 = await ctx.stub.getState("vote_tally");
        if (!previous_vote_tally_b64 || previous_vote_tally_b64.length === 0) {
            // throw new Error(`${carNumber} does not exist`);
            await ctx.stub.putState("vote_tally", vote);
            return;
        }

        // console.debug("[DEBUG] Previous vote tally length: " + previous_vote_tally_b64.length);
        // console.debug("[DEBUG] Previous vote tally: " + typeof(previous_vote_tally_b64));

        const [ seal, he_context ] = await this.initHEContext();
        let previous_vote_tally_ciphertext = seal.CipherText();
        previous_vote_tally_ciphertext.load(he_context, previous_vote_tally_b64);

        let new_vote_ciphertext = seal.CipherText();
        new_vote_ciphertext.load(he_context, vote);

        let vote_tally_ciphertext = seal.CipherText();

        const evaluator = seal.Evaluator(he_context);
        evaluator.add(previous_vote_tally_ciphertext, new_vote_ciphertext, vote_tally_ciphertext);
        await ctx.stub.putState("vote_tally", vote_tally_ciphertext.save());


        evaluator.delete();
        previous_vote_tally_ciphertext.delete();
        new_vote_ciphertext.delete();
        vote_tally_ciphertext.delete();
        he_context.delete();
        // each SEAL initialization (await SEAL()) adds another listener
        // this produces "Possible EventEmitter memory leak detected." warnings on tests
        // however, it may not matter on the blockchain, where state is not preserved
        process.removeAllListeners("uncaughtException");
        process.removeAllListeners("unhandledRejection");
    }

    async retrieveTally(ctx) {
        // let stage = ctx.stub.getState("stage");
        // if (stage !== VotingStageEnum.ENDED) {
        //     throw Error("voting is has not ended yet");
        // }

        return await ctx.stub.getState("vote_tally");
    }
}

module.exports = VoteCollectorContract;
