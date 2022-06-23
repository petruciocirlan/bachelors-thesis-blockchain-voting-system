const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const port = 3000;

app.use(bodyParser.json({limit: '50mb'}));

const utils = require('./utils');


// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

app.get('/encrypt-vote', async (req, res) => {
    console.log("Incoming encryption request.");

    const [ seal, context, publicKey ] = await utils.initHEContext();
    
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

    // underlying C++ handlers are no garbage collected, they must deleted explicitly
    cipherText.delete();
    encryptor.delete();

    plainText.delete();
    encoder.delete();

    context.delete();
    
    // SEAL leaves behind listeners for each new context that clog up the listener context
    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");
});

// app.get('/test-add', async (req, res) => {
//     const [ seal, he_context, publicKey ] = await initHEContext();
//
//     let vote_a = req.body.vote_a;
//     let vote_b = req.body.vote_b;
//
//     let vote_a_ctxt = seal.CipherText();
//     vote_a_ctxt.load(he_context, vote_a);
//
//     let vote_b_ctxt = seal.CipherText();
//     vote_b_ctxt.load(he_context, vote_b);
//
//     let vote_tally_ciphertext = seal.CipherText();
//
//     const evaluator = seal.Evaluator(he_context);
//     evaluator.add(vote_a_ctxt, vote_b_ctxt, vote_tally_ciphertext);
//
//     secretKey = seal.SecretKey();
//     const secretKeyData = fs.readFileSync("keys/he/sec.key", 'utf8');
//     secretKey.load(he_context, secretKeyData);
//
//     const decryptor = seal.Decryptor(he_context, secretKey);
//     const plainTextX = decryptor.decrypt(vote_tally_ciphertext);
//
//     const encoder = seal.BatchEncoder(he_context);
//     const decoded = encoder.decode(
//         plainTextX,
//         false
//     );
//
//     res.json(JSON.stringify(decoded));
//
//     // console.log(`Decoded: ${decoded}`)
//
//     // underlying C++ handlers are no garbage collected, they must deleted explicitly
//     encoder.delete();
//     decryptor.delete();
//     secretKey.delete();
//     evaluator.delete();
//     vote_b_ctxt.delete();
//     vote_a_ctxt.delete();
//     vote_tally_ciphertext.delete();
//     publicKey.delete();
//     he_context.delete();
//
//     // SEAL leaves behind listeners for each new context that clog up the listener context
//     process.removeAllListeners("uncaughtException");
//     process.removeAllListeners("unhandledRejection");
// })

app.get('/send-vote', async (req, res) => {
    let vote = req.body.vote;
    let machine_signature = req.body.machine_signature;
    let voter_signature = req.body.voter_signature;

    await utils.invoke('submitVote', [vote, machine_signature, voter_signature]).catch((reason) => {console.error(reason)});

    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`NodeJS homomorphic encryption server and Fabric client intermediary listening on port ${port}`)
});
