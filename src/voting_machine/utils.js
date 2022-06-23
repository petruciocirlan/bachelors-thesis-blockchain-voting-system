
'use-strict';

const fs = require('fs');
const SEAL = require('node-seal');
const execSync = require('child_process').execSync;

function printArgs(func, args) {
    if (!Array.isArray(args)) {
        if (func) {
            return JSON.stringify({"function":func, "Args": []});
        } else {
            return JSON.stringify({"Args": []});
        }
    }
    
    return JSON.stringify({"function":func, "Args": args});
}

async function invoke(func, args) {
    // let cmd = `export PATH="${dir}/bin:$PATH" && export FABRIC_CFG_PATH=${dir}/config/ && ` +
    //     `export CORE_PEER_TLS_ENABLED=true && export CORE_PEER_LOCALMSPID="Org1MSP" && ` +
    //     `export CORE_PEER_TLS_ROOTCERT_FILE=${dir}/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt && ` +
    //     `export CORE_PEER_MSPCONFIGPATH=${dir}/test-network/organizations/peerOrganizations/org1.example.com/users/owner@org1.example.com/msp && ` +
    //     `export CORE_PEER_ADDRESS=localhost:7051 && `;

    let cmd = `sudo docker exec -e “CORE_PEER_LOCALMSPID=Org1MSP” -e “CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp” ` +
              `cli peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n mycc -c '${printArgs(func, args)}'`;

    const {stderr, stdout} = execSync(cmd);
    if (stderr) {
        // throw new Error(stderr);
        console.error(stderr);
    }

    console.log(stdout);
}

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

module.exports = {initHEContext, invoke};
