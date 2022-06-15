const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const port = 3000;

app.use(bodyParser.json({limit: '50mb'}));

const fs = require('fs');
const SEAL = require('node-seal');

const initHEContext = async () => {
    const seal = await SEAL();
    const schemeType = seal.SchemeType.bfv;         // Homomorphic Encryption (HE) Scheme
    const securityLevel = seal.SecurityLevel.tc128; // AES 128, could switch to AES 256 which can still provide AES 128 safety under large quantum computer attacks
    const polyModulusDegree = 2**12;                // Polynomial coefficient modulus m
    const bitSizes = [36, 36, 37];                  // Chain of prime sizes
    const bitSize = 32;                             // Plaintext modulus bit size

    let encParms = seal.EncryptionParameters(schemeType);
    let missingKeys = false;
    if (fs.existsSync("keys/he/encryption.parameters")) {
        // File exists
        const encParmsData = fs.readFileSync("keys/he/encryption.parameters", 'utf8');
        encParms.load(encParmsData);
    } else {
        // File does not exist

        // Set the PolyModulusDegree
        encParms.setPolyModulusDegree(polyModulusDegree);
        // Create a suitable set of CoeffModulus primes
        encParms.setCoeffModulus(
            seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes))
        );
        // Set the PlainModulus to a prime of bitSize 32.
        encParms.setPlainModulus(seal.PlainModulus.Batching(polyModulusDegree, bitSize));

        // fs.writeFileSync("keys/he/encryption.parameters", encParms.save());
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

    let publicKey = null;
    if (missingKeys) {
        // Files do not exist
        const keyGenerator = seal.KeyGenerator(context);
        const secretKey = keyGenerator.secretKey();
        publicKey = keyGenerator.createPublicKey();

        fs.writeFileSync("keys/he/sec.key", secretKey.save());
        fs.writeFileSync("keys/he/pub.key", publicKey.save());
        fs.writeFileSync("keys/he/encryption.parameters", encParms.save());
    } else {
        // Files exist
        publicKey = seal.PublicKey();
        const publicKeyData = fs.readFileSync("keys/he/pub.key", 'utf8');
        publicKey.load(context, publicKeyData);
    }

    return [ seal, context, publicKey ];
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/encrypt-vote', async (req, res) => {
    console.log("Incoming encryption request.");

    const [ seal, context, publicKey ] = await initHEContext();
    
    console.log(`Data type: ${typeof(req.body.vote)}`);
    console.log(`Data type: ${typeof(JSON.parse(req.body.vote))}`);
    let vote_array = JSON.parse(req.body.vote);
    console.log(`Data: ${vote_array}`);

    const encoder = seal.BatchEncoder(context);
    const plainText = encoder.encode(
        Uint32Array.from(vote_array)
    );
    
    const encryptor = seal.Encryptor(context, publicKey);
    const cipherText = encryptor.encrypt(plainText);

    res.send(cipherText.save());

    cipherText.delete();
    encryptor.delete();

    plainText.delete();
    encoder.delete();

    context.delete();
});

app.get('/test-add', async (req, res) => {
    const [ seal, he_context, publicKey ] = await initHEContext();

    let vote_a = req.body.vote_a;
    let vote_b = req.body.vote_b;

    let vote_a_ctxt = seal.CipherText();
    vote_a_ctxt.load(he_context, vote_a);

    let vote_b_ctxt = seal.CipherText();
    vote_b_ctxt.load(he_context, vote_b);

    let vote_tally_ciphertext = seal.CipherText();

    const evaluator = seal.Evaluator(he_context);
    evaluator.add(vote_a_ctxt, vote_b_ctxt, vote_tally_ciphertext);

    secretKey = seal.SecretKey();
    const secretKeyData = fs.readFileSync("keys/he/sec.key", 'utf8');
    secretKey.load(he_context, secretKeyData);

    const decryptor = seal.Decryptor(he_context, secretKey);
    const plainTextX = decryptor.decrypt(vote_tally_ciphertext);

    const encoder = seal.BatchEncoder(he_context);
    const decoded = encoder.decode(
        plainTextX,
        false
    );

    res.json(JSON.stringify(decoded));

    // console.log(`Decoded: ${decoded}`)

    encoder.delete();
    decryptor.delete();
    secretKey.delete();
    evaluator.delete();
    vote_b_ctxt.delete();
    vote_a_ctxt.delete();
    vote_tally_ciphertext.delete();
    publicKey.delete();
    he_context.delete();
    
    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");
})

app.get('/send-vote', (req, res) => {
    // TODO: send vote
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});
