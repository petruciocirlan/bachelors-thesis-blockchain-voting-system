package com.example.votesigner;

import android.content.Intent;
import android.os.Bundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;
import android.widget.Button;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.SignatureException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;

public class SignVoteActivity extends AppCompatActivity {
    private String vote;
    private byte[] signature;
    private PublicKey publicKey;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sign_vote);

        Bundle extras = getIntent().getExtras();
        vote = extras.getString("vote");

        signVote();

        Button signVoteButton = findViewById(R.id.activity_sign_vote_signButton);
        signVoteButton.setText(R.string.sign_vote);
        signVoteButton.setOnClickListener(v -> {
            Toast.makeText(getApplicationContext(), vote, Toast.LENGTH_SHORT).show();
            Log.i(MainActivity.class.getSimpleName(), "Vote signed!");
            switchToQRCodeActivity();
        });
    }

    private void switchToQRCodeActivity() {
        Intent qrCodeIntent = new Intent(this, QRCodeSignatureActivity.class);

        // Confirmed: data arrives as intended
//        try {
//            MessageDigest md = MessageDigest.getInstance("MD5");
//            md.update(signature);
//            byte[] digest = md.digest();
//            String myHash = bytesToHex(digest);
//            Log.i("SIGNATURE MD5", myHash);
//
//            md.reset();
//            md.update(publicKey.getEncoded());
//            digest = md.digest();
//            myHash = bytesToHex(digest);
//            Log.i("PUBLIC KEY MD5", myHash);
//        } catch (NoSuchAlgorithmException e) {
//            e.printStackTrace();
//        }

        qrCodeIntent.putExtra("signature", Base64.encodeToString(signature, Base64.DEFAULT));
        qrCodeIntent.putExtra("publicKey", Base64.encodeToString(publicKey.getEncoded(), Base64.DEFAULT));
        startActivity(qrCodeIntent);
//        finish();
    }

    private void signVote() {
        try {
            PrivateKey privateKey = getPrivateKey();
            Signature s = Signature.getInstance("SHA256withRSA");
            s.initSign(privateKey);
            s.update(decodeVote());
            signature = s.sign();

        } catch (InvalidAlgorithmParameterException | UnrecoverableKeyException | KeyStoreException | NoSuchAlgorithmException | NoSuchProviderException | InvalidKeyException | SignatureException | CertificateException | IOException e) {
            e.printStackTrace();
        }
    }

    private PrivateKey getPrivateKey() throws KeyStoreException, NoSuchAlgorithmException, NoSuchProviderException, InvalidAlgorithmParameterException, UnrecoverableKeyException, CertificateException, IOException {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);

        ks.deleteEntry("vote_signer");
        if (ks.isKeyEntry("vote_signer")) {
            Log.i(MainActivity.class.getSimpleName(), "Retrieved private key from KeyStore");
            publicKey = ks.getCertificate("vote_signer").getPublicKey();
            Log.i("CERTIFICATE TYPE", ks.getCertificate("vote_signer").getType());
            return (PrivateKey) ks.getKey("vote_signer", null);
        }

        KeyPairGenerator kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore");

        kpg.initialize(new KeyGenParameterSpec.Builder(
                "vote_signer",
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
                .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                .build());

        KeyPair kp = kpg.generateKeyPair();

        Log.i(MainActivity.class.getSimpleName(), "Created and stored private key in KeyStore");
        publicKey = kp.getPublic();
        return kp.getPrivate();
    }

    private byte[] decodeVote()
    {
        return Base64.decode(vote.getBytes(StandardCharsets.UTF_8), Base64.DEFAULT);
    }

//    private static final char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();
//    public static String bytesToHex(byte[] bytes) {
//        char[] hexChars = new char[bytes.length * 2];
//        for (int j = 0; j < bytes.length; j++) {
//            int v = bytes[j] & 0xFF;
//            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
//            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
//        }
//        return new String(hexChars);
//    }
}
