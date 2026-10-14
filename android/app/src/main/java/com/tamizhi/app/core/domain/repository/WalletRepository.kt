package com.tamizhi.app.core.domain.repository

import com.tamizhi.app.core.domain.model.Transaction
import com.tamizhi.app.core.domain.model.Wallet
import com.tamizhi.app.core.domain.model.WalletBalance
import kotlinx.coroutines.flow.Flow

interface WalletRepository {

    /** Emits the currently active wallet, or null if none exists. */
    fun getActiveWallet(): Flow<Wallet?>

    /** Emits all wallets ordered by creation date. */
    fun getAllWallets(): Flow<List<Wallet>>

    /**
     * Creates a new wallet from the given BIP-39 mnemonic.
     * Encrypts the mnemonic with the Android Keystore and persists to Room.
     */
    suspend fun createWallet(mnemonic: String, label: String): Wallet

    /** Import an existing wallet from mnemonic. */
    suspend fun importWallet(mnemonic: String, label: String): Wallet

    /** Switches the active wallet. */
    suspend fun setActiveWallet(address: String)

    /** Updates the display label of a wallet. */
    suspend fun updateWalletLabel(address: String, label: String)

    /** Permanently deletes a wallet record (keys are not recoverable). */
    suspend fun deleteWallet(address: String)

    /** Whether any wallet has been created/imported. */
    suspend fun hasWallet(): Boolean

    /** Fetch on-chain balance for the given address. */
    suspend fun getBalance(address: String): Result<WalletBalance>

    /** Fetch transaction history for the given address. */
    suspend fun getTransactions(address: String, limit: Int = 50): Result<List<Transaction>>

    /**
     * Sign and broadcast a TMZ transfer.
     * Returns the tx hash on success.
     */
    suspend fun sendTokens(
        fromAddress: String,
        toAddress: String,
        amountUtmz: Long,
        memo: String,
        feeUtmz: Long
    ): Result<String>

    /** Decrypt the stored mnemonic for backup display purposes. */
    suspend fun exportMnemonic(address: String): Result<String>
}
