'use strict';

const SEAL = require('node-seal');
const fs = require('fs');

const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub } = require('fabric-shim');

const VoteCollectorContract = require('../lib/vote_collector');

const initHEContext = async() => {
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

const decryptVote = async (vote) => {
    const [ seal, he_context ] = await initHEContext();
    const secretKey = seal.SecretKey();
    const secretKeyData = fs.readFileSync("../../../voting_machine/keys/he/sec.key", 'utf8');
    secretKey.load(he_context, secretKeyData);

    const cipherText = seal.CipherText();
    cipherText.load(he_context, vote);
    const decryptor = seal.Decryptor(he_context, secretKey);
    const plainText = decryptor.decrypt(cipherText);
    
    const encoder = seal.BatchEncoder(he_context);
    const decoded = encoder.decode(
        plainText,
        false
    );

    encoder.delete();
    plainText.delete();
    decryptor.delete();
    cipherText.delete();
    secretKey.delete();
    he_context.delete();

    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");

    return decoded;
}

let assert = sinon.assert;
chai.use(sinonChai);

describe('Vote Collector Tests', () => {
    let transactionContext, chaincodeStub, vote;
    beforeEach(() => {
        transactionContext = new Context();

        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
            // console.log("[PUT STATE] " + key + " => " + value);
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
                // console.log("[GET STATE] " + key + " => " + ret);
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.getStateByRange.callsFake(async () => {
            function* internalGetStateByRange() {
                if (chaincodeStub.states) {
                    // Shallow copy
                    const copied = Object.assign({}, chaincodeStub.states);

                    for (let key in copied) {
                        yield {value: copied[key]};
                    }
                }
            }

            return Promise.resolve(internalGetStateByRange());
        });

        
        vote = fs.readFileSync("./test/vote_example_2.dat", 'utf8');
    });

    describe('Test instantiate', () => {
        it('should return success on instantiate', async () => {
            let voteSubmission = new VoteCollectorContract();
            await voteSubmission.instantiate(transactionContext);
            // console.info("[TEST] Instantiate set stage: " + await chaincodeStub.getState("stage"));
        });
    });

    describe('Test submitVote', () => {
        it('should refuse vote outside voting time', async () => {
            let voteSubmission = new VoteCollectorContract();
            try {
                await voteSubmission.submitVote(transactionContext, vote);
                assert.fail('submitVote should have failed');
            } catch (err) {
                expect(err.message).to.equal('voting is not ongoing');
            }
        });

        
        it('should accept first vote', async () => {
            let voteSubmission = new VoteCollectorContract();
            voteSubmission.instantiate(transactionContext);
            
            await voteSubmission.submitVote(transactionContext, vote);
        });

        
        it('should add two votes', async () => {
            let voteSubmission = new VoteCollectorContract();
            voteSubmission.instantiate(transactionContext);

            let vote0 = fs.readFileSync("./test/vote_example_0.dat", 'utf8');
            let vote1 = fs.readFileSync("./test/vote_example_1.dat", 'utf8');
            
            await voteSubmission.submitVote(transactionContext, vote0);
            await voteSubmission.submitVote(transactionContext, vote1);
        });

        
        it('should add ten votes', async () => {
            let voteSubmission = new VoteCollectorContract();
            voteSubmission.instantiate(transactionContext);

            let vote0 = fs.readFileSync("./test/vote_example_0.dat", 'utf8');
            let vote1 = fs.readFileSync("./test/vote_example_1.dat", 'utf8');
            
            await voteSubmission.submitVote(transactionContext, vote0);
            await voteSubmission.submitVote(transactionContext, vote1);
            await voteSubmission.submitVote(transactionContext, vote);
            await voteSubmission.submitVote(transactionContext, vote);
            await voteSubmission.submitVote(transactionContext, vote0);
            await voteSubmission.submitVote(transactionContext, vote1);
            await voteSubmission.submitVote(transactionContext, vote1);
            await voteSubmission.submitVote(transactionContext, vote1);
            await voteSubmission.submitVote(transactionContext, vote0);
            await voteSubmission.submitVote(transactionContext, vote1);
        }).timeout(5000);
    });

    describe('Test retrieveTally', () => {        
        it('should return accurate and decryptable tally', async () => {
            let voteSubmission = new VoteCollectorContract();
            voteSubmission.instantiate(transactionContext);

            let vote0 = vote;                                                               // voted party 0
            let vote2 = fs.readFileSync("./test/vote_example_0.dat", 'utf8');  // voted party 2
            let vote4 = fs.readFileSync("./test/vote_example_1.dat", 'utf8');  // voted party 4
            
            await voteSubmission.submitVote(transactionContext, vote2);
            await voteSubmission.submitVote(transactionContext, vote4);
            await voteSubmission.submitVote(transactionContext, vote0);
            await voteSubmission.submitVote(transactionContext, vote0);
            await voteSubmission.submitVote(transactionContext, vote2);
            await voteSubmission.submitVote(transactionContext, vote4);
            await voteSubmission.submitVote(transactionContext, vote4);
            await voteSubmission.submitVote(transactionContext, vote4);
            await voteSubmission.submitVote(transactionContext, vote2);
            await voteSubmission.submitVote(transactionContext, vote4);

            const encrypted_tally = await voteSubmission.retrieveTally(transactionContext);
            const decoded = await decryptVote(encrypted_tally);
            expect(decoded).to.be.a('Uint32Array');
            expect(decoded.length).to.equal(4096); // poly modulus
            expect(decoded[0]).to.equal(2);
            expect(decoded[1]).to.equal(0);
            expect(decoded[2]).to.equal(3);
            expect(decoded[3]).to.equal(0);
            expect(decoded[4]).to.equal(5);
        }).timeout(5000);
    });
});