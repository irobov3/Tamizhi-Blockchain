package com.tamizhi.app.core.data.local

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.goterl.lazysodium.LazySodiumAndroid
import com.goterl.lazysodium.SodiumAndroid
import com.goterl.lazysodium.interfaces.Box
import com.goterl.lazysodium.utils.Key
import com.goterl.lazysodium.utils.KeyPair
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

data class EncryptedData(
    val ciphertext: String,   // base64
    val iv: String            // base64 GCM IV (12 bytes)
)

data class X25519Keypair(
    val publicKey: ByteArray,   // Curve25519 public (32 bytes)
    val secretKey: ByteArray    // Curve25519 secret (32 bytes)
) {
    val publicKeyBase64: String get() = Base64.encodeToString(publicKey, Base64.NO_WRAP)
    val secretKeyBase64: String get() = Base64.encodeToString(secretKey, Base64.NO_WRAP)
}

data class BoxResult(
    val ciphertext: ByteArray,   // encrypted bytes (includes MAC)
    val nonce: ByteArray         // 24-byte random nonce
)

@Singleton
class CryptoManager @Inject constructor() {

    private val keyAlias = "tamizhi_master_key"
    private val androidKeyStore = "AndroidKeyStore"
    private val gcmTagLength = 128  // bits
    private val gcmIvLength = 12    // bytes

    private val sodium: LazySodiumAndroid by lazy {
        LazySodiumAndroid(SodiumAndroid())
    }

    // ── Android Keystore (AES-256-GCM) ───────────────────────────────────────

    fun generateOrGetKey(): SecretKey {
        val keyStore = KeyStore.getInstance(androidKeyStore).apply { load(null) }
        if (keyStore.containsAlias(keyAlias)) {
            return (keyStore.getEntry(keyAlias, null) as KeyStore.SecretKeyEntry).secretKey
        }
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            androidKeyStore
        )
        val keySpec = KeyGenParameterSpec.Builder(
            keyAlias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(false)  // key usable without auth; biometric checked at app layer
            .setInvalidatedByBiometricEnrollment(false)
            .build()
        keyGenerator.init(keySpec)
        return keyGenerator.generateKey()
    }

    fun encrypt(plaintext: String): EncryptedData {
        val secretKey = generateOrGetKey()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        val iv = cipher.iv  // 12 bytes, auto-generated
        val cipherBytes = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return EncryptedData(
            ciphertext = Base64.encodeToString(cipherBytes, Base64.NO_WRAP),
            iv = Base64.encodeToString(iv, Base64.NO_WRAP)
        )
    }

    fun decrypt(data: EncryptedData): String {
        val secretKey = generateOrGetKey()
        val iv = Base64.decode(data.iv, Base64.NO_WRAP)
        val cipherBytes = Base64.decode(data.ciphertext, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(gcmTagLength, iv)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)
        val plainBytes = cipher.doFinal(cipherBytes)
        return String(plainBytes, Charsets.UTF_8)
    }

    fun encryptString(plaintext: String): String {
        val data = encrypt(plaintext)
        // Serialize as "iv:ciphertext" for single-field storage
        return "${data.iv}:${data.ciphertext}"
    }

    fun decryptString(encoded: String): String {
        val parts = encoded.split(":", limit = 2)
        require(parts.size == 2) { "Invalid encrypted format" }
        return decrypt(EncryptedData(ciphertext = parts[1], iv = parts[0]))
    }

    // ── NaCl Box (X25519 + XSalsa20-Poly1305) ────────────────────────────────

    fun generateX25519Keypair(): X25519Keypair {
        val keyPair: KeyPair = sodium.cryptoBoxKeypair()
        return X25519Keypair(
            publicKey = keyPair.publicKey.asBytes,
            secretKey = keyPair.secretKey.asBytes
        )
    }

    fun boxEncrypt(
        message: ByteArray,
        recipientPublicKey: ByteArray,
        senderSecretKey: ByteArray
    ): BoxResult {
        val nonce = ByteArray(Box.NONCEBYTES)
        sodium.randombytesBuf(nonce, Box.NONCEBYTES)

        val ciphertext = ByteArray(message.size + Box.MACBYTES)
        val success = sodium.cryptoBoxEasy(
            ciphertext,
            message,
            message.size.toLong(),
            nonce,
            recipientPublicKey,
            senderSecretKey
        )
        check(success) { "NaCl box encryption failed" }
        return BoxResult(ciphertext = ciphertext, nonce = nonce)
    }

    fun boxDecrypt(
        ciphertext: ByteArray,
        nonce: ByteArray,
        senderPublicKey: ByteArray,
        recipientSecretKey: ByteArray
    ): ByteArray? {
        val plaintext = ByteArray(ciphertext.size - Box.MACBYTES)
        val success = sodium.cryptoBoxOpenEasy(
            plaintext,
            ciphertext,
            ciphertext.size.toLong(),
            nonce,
            senderPublicKey,
            recipientSecretKey
        )
        return if (success) plaintext else null
    }

    fun boxEncryptToBase64(
        message: String,
        recipientPublicKey: ByteArray,
        senderSecretKey: ByteArray
    ): String {
        val result = boxEncrypt(
            message = message.toByteArray(Charsets.UTF_8),
            recipientPublicKey = recipientPublicKey,
            senderSecretKey = senderSecretKey
        )
        // Serialize as nonce:ciphertext for transport
        val nonceB64 = Base64.encodeToString(result.nonce, Base64.NO_WRAP)
        val ciphertextB64 = Base64.encodeToString(result.ciphertext, Base64.NO_WRAP)
        return "$nonceB64:$ciphertextB64"
    }

    fun boxDecryptFromBase64(
        encoded: String,
        senderPublicKey: ByteArray,
        recipientSecretKey: ByteArray
    ): String? {
        val parts = encoded.split(":", limit = 2)
        if (parts.size != 2) return null
        val nonce = Base64.decode(parts[0], Base64.NO_WRAP)
        val ciphertext = Base64.decode(parts[1], Base64.NO_WRAP)
        val plainBytes = boxDecrypt(
            ciphertext = ciphertext,
            nonce = nonce,
            senderPublicKey = senderPublicKey,
            recipientSecretKey = recipientSecretKey
        ) ?: return null
        return String(plainBytes, Charsets.UTF_8)
    }
}
