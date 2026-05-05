package com.tamizhi.app.core.domain.model

data class Wallet(
    val address: String,
    val publicKey: String,
    val x25519PublicKey: String,
    val label: String,
    val isActive: Boolean,
    val createdAt: Long,
    val balance: WalletBalance? = null
)

data class WalletBalance(
    val tmz: String,     // human-readable TMZ amount
    val utmz: String,    // raw micro-TMZ amount
    val usdValue: String? = null
)

data class Transaction(
    val txHash: String,
    val fromAddress: String,
    val toAddress: String,
    val amount: String,
    val denom: String,
    val fee: String,
    val memo: String,
    val timestamp: String,
    val height: Long,
    val success: Boolean,
    val direction: TxDirection
)

enum class TxDirection { SENT, RECEIVED, SELF }
