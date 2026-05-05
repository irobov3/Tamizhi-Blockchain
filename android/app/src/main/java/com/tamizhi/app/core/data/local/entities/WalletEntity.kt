package com.tamizhi.app.core.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "wallets")
data class WalletEntity(
    @PrimaryKey val address: String,
    val encryptedMnemonic: String,   // AES-256-GCM encrypted via Android Keystore
    val publicKey: String,            // secp256k1 public key (hex)
    val x25519PublicKey: String,      // Curve25519 key for X3DH key exchange
    val label: String,
    val isActive: Boolean,
    val createdAt: Long               // epoch millis
)
