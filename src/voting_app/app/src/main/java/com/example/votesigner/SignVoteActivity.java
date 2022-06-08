package com.example.votesigner;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;
import android.widget.Button;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.security.crypto.MasterKeys;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.Key;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.SignatureException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;

public class SignVoteActivity extends AppCompatActivity {
    private String vote;
    private String signature;

    @RequiresApi(api = Build.VERSION_CODES.M)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sign_vote);

        Bundle extras = getIntent().getExtras();
        vote = extras.getString("vote");

        signVote();

        Button signVoteButton = findViewById(R.id.activity_sign_vote_signButton);
        signVoteButton.setText("Sign Vote");
        signVoteButton.setOnClickListener(v -> {
            Toast.makeText(getApplicationContext(), vote, Toast.LENGTH_SHORT).show();
            Log.i(MainActivity.class.getSimpleName(), "Vote signed!");
            switchToQRCodeActivity();
        });
    }

    private void switchToQRCodeActivity()
    {
        Intent qrCodeIntent = new Intent(this, QRCodeSignatureActivity.class);
        qrCodeIntent.putExtra("signature", signature);
        startActivity(qrCodeIntent);
//        finish();
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    private void signVote() {
        try {
            PrivateKey privateKey = getPrivateKey();
            Signature s = Signature.getInstance("SHA256withECDSA");
            s.initSign(privateKey);
            s.update(decodeVote());
            signature = Base64.encodeToString(s.sign(), Base64.DEFAULT);

        } catch (InvalidAlgorithmParameterException | UnrecoverableKeyException | KeyStoreException | NoSuchAlgorithmException | NoSuchProviderException | InvalidKeyException | SignatureException | CertificateException | IOException e) {
            e.printStackTrace();
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    private PrivateKey getPrivateKey() throws KeyStoreException, NoSuchAlgorithmException, NoSuchProviderException, InvalidAlgorithmParameterException, UnrecoverableKeyException, CertificateException, IOException {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);

        if (ks.isKeyEntry("vote_signer")) {
            Log.i(MainActivity.class.getSimpleName(), "Retrieved private key from KeyStore");
            return (PrivateKey) ks.getKey("vote_signer", null);
        }

        KeyPairGenerator kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore");

        kpg.initialize(new KeyGenParameterSpec.Builder(
                "vote_signer",
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
                .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
                .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                .setSignaturePaddings()
                .build());

        KeyPair kp = kpg.generateKeyPair();

        ks.setKeyEntry("vote_signer_public", kp.getPublic(), null, null);

        Log.i(MainActivity.class.getSimpleName(), "Created and stored private key in KeyStore");
        return kp.getPrivate();
    }

    private byte[] decodeVote()
    {
        return Base64.decode(vote.getBytes(StandardCharsets.UTF_8), Base64.DEFAULT);
    }
}
