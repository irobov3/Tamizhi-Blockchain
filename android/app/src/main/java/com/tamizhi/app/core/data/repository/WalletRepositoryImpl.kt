package com.tamizhi.app.core.data.repository

import android.util.Base64
import com.tamizhi.app.core.data.local.CryptoManager
import com.tamizhi.app.core.data.local.dao.WalletDao
import com.tamizhi.app.core.data.local.entities.WalletEntity
import com.tamizhi.app.core.data.remote.api.ChainApi
import com.tamizhi.app.core.domain.model.Transaction
import com.tamizhi.app.core.domain.model.TxDirection
import com.tamizhi.app.core.domain.model.Wallet
import com.tamizhi.app.core.domain.model.WalletBalance
import com.tamizhi.app.core.domain.repository.WalletRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WalletRepositoryImpl @Inject constructor(
    private val walletDao: WalletDao,
    private val chainApi: ChainApi,
    private val cryptoManager: CryptoManager
) : WalletRepository {

    override fun getActiveWallet(): Flow<Wallet?> =
        walletDao.getActiveWallet().map { it?.toDomain() }

    override fun getAllWallets(): Flow<List<Wallet>> =
        walletDao.getAllWallets().map { list -> list.map { it.toDomain() } }

    override suspend fun createWallet(mnemonic: String, label: String): Wallet {
        // Generate X25519 keypair for E2E messaging
        val x25519Keypair = cryptoManager.generateX25519Keypair()

        // Derive address from mnemonic (simplified — real impl uses secp256k1 + bech32)
        val address = deriveAddress(mnemonic)
        val publicKey = derivePublicKey(mnemonic)

        val encryptedMnemonic = cryptoManager.encryptString(mnemonic)

        val entity = WalletEntity(
            address = address,
            encryptedMnemonic = encryptedMnemonic,
            publicKey = publicKey,
            x25519PublicKey = x25519Keypair.publicKeyBase64,
            label = label,
            isActive = walletDao.walletCount() == 0,
            createdAt = System.currentTimeMillis()
        )
        walletDao.insertWallet(entity)
        return entity.toDomain()
    }

    override suspend fun importWallet(mnemonic: String, label: String): Wallet =
        createWallet(mnemonic, label)

    override suspend fun setActiveWallet(address: String) {
        walletDao.setActiveWallet(address)
    }

    override suspend fun updateWalletLabel(address: String, label: String) {
        walletDao.updateLabel(address, label)
    }

    override suspend fun deleteWallet(address: String) {
        walletDao.deleteWallet(address)
    }

    override suspend fun hasWallet(): Boolean = walletDao.walletCount() > 0

    override suspend fun getBalance(address: String): Result<WalletBalance> = runCatching {
        val response = chainApi.getBalance(address)
        val utmzCoin = response.balances.firstOrNull { it.denom == "utmz" }
        val utmzAmount = utmzCoin?.amount?.toLongOrNull() ?: 0L
        val tmzAmount = utmzAmount.toDouble() / 1_000_000.0
        WalletBalance(
            tmz = "%.6f".format(tmzAmount).trimEnd('0').trimEnd('.'),
            utmz = utmzAmount.toString()
        )
    }

    override suspend fun getTransactions(address: String, limit: Int): Result<List<Transaction>> =
        runCatching {
            val sentEvents = "message.sender='$address'"
            val receivedEvents = "transfer.recipient='$address'"

            val sentResponse = runCatching { chainApi.getTransactions(sentEvents, limit) }
            val receivedResponse = runCatching { chainApi.getTransactions(receivedEvents, limit) }

            val allTxResponses = buildList {
                sentResponse.getOrNull()?.txResponses?.forEach { add(it to true) }
                receivedResponse.getOrNull()?.txResponses?.forEach { add(it to false) }
            }.distinctBy { it.first.txHash }
                .sortedByDescending { it.first.timestamp }
                .take(limit)

            allTxResponses.map { (txResponse, isSent) ->
                Transaction(
                    txHash = txResponse.txHash,
                    fromAddress = if (isSent) address else "unknown",
                    toAddress = if (!isSent) address else "unknown",
                    amount = "0",
                    denom = "utmz",
                    fee = "0",
                    memo = "",
                    timestamp = txResponse.timestamp,
                    height = txResponse.height.toLongOrNull() ?: 0L,
                    success = txResponse.code == 0,
                    direction = when {
                        isSent -> TxDirection.SENT
                        else -> TxDirection.RECEIVED
                    }
                )
            }
        }

    override suspend fun sendTokens(
        fromAddress: String,
        toAddress: String,
        amountUtmz: Long,
        memo: String,
        feeUtmz: Long
    ): Result<String> = runCatching {
        // In a real implementation this would:
        // 1. Retrieve the signing key from encrypted storage
        // 2. Build a Cosmos SDK MsgSend transaction
        // 3. Sign with secp256k1 private key
        // 4. Encode to protobuf and base64
        // 5. Broadcast via chainApi.broadcastTx()
        // For now, returns a placeholder tx hash
        val txBytes = buildSignedTxBytes(fromAddress, toAddress, amountUtmz, memo, feeUtmz)
        val response = chainApi.broadcastTx(
            com.tamizhi.app.core.data.remote.dto.BroadcastTxRequest(txBytes = txBytes)
        )
        check(response.txResponse.code == 0) {
            "Broadcast failed: ${response.txResponse.rawLog}"
        }
        response.txResponse.txHash
    }

    override suspend fun exportMnemonic(address: String): Result<String> = runCatching {
        val entity = walletDao.getWallet(address)
            ?: error("Wallet not found: $address")
        cryptoManager.decryptString(entity.encryptedMnemonic)
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private fun deriveAddress(mnemonic: String): String {
        // Production: use BIP32/BIP44 + bech32 encoding for Cosmos (prefix "tmz")
        // This is a deterministic placeholder based on the mnemonic hash
        val hash = mnemonic.hashCode().toLong().and(0xFFFFFFFFL)
        return "tmz1${hash.toString(16).padStart(38, '0')}"
    }

    private fun derivePublicKey(mnemonic: String): String {
        // Production: use secp256k1 library (e.g., bitcoinj) to derive the compressed public key
        val hash = mnemonic.hashCode()
        return Base64.encodeToString(
            ByteArray(33) { i -> ((hash shr i) and 0xFF).toByte() },
            Base64.NO_WRAP
        )
    }

    private fun buildSignedTxBytes(
        fromAddress: String,
        toAddress: String,
        amountUtmz: Long,
        memo: String,
        feeUtmz: Long
    ): String {
        // Production: construct and sign a Cosmos SignDoc using protobuf
        val payload = "$fromAddress->$toAddress:$amountUtmz:$feeUtmz:$memo"
        return Base64.encodeToString(payload.toByteArray(), Base64.NO_WRAP)
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private fun WalletEntity.toDomain() = Wallet(
        address = address,
        publicKey = publicKey,
        x25519PublicKey = x25519PublicKey,
        label = label,
        isActive = isActive,
        createdAt = createdAt
    )
}
