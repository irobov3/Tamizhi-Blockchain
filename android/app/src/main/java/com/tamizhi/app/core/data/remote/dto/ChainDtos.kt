package com.tamizhi.app.core.data.remote.dto

import com.google.gson.annotations.SerializedName

// ── Balance ───────────────────────────────────────────────────────────────────

data class BalanceResponse(
    @SerializedName("balances") val balances: List<CoinDto>,
    @SerializedName("pagination") val pagination: PaginationDto?
)

data class CoinDto(
    @SerializedName("denom") val denom: String,
    @SerializedName("amount") val amount: String
)

data class PaginationDto(
    @SerializedName("next_key") val nextKey: String?,
    @SerializedName("total") val total: String?
)

// ── Transactions ──────────────────────────────────────────────────────────────

data class TxListResponse(
    @SerializedName("txs") val txs: List<TxRawDto>,
    @SerializedName("tx_responses") val txResponses: List<TxResponseDto>,
    @SerializedName("pagination") val pagination: PaginationDto?
)

data class TxRawDto(
    @SerializedName("body") val body: TxBodyDto,
    @SerializedName("auth_info") val authInfo: AuthInfoDto
)

data class TxBodyDto(
    @SerializedName("messages") val messages: List<TxMessageDto>,
    @SerializedName("memo") val memo: String
)

data class TxMessageDto(
    @SerializedName("@type") val type: String,
    @SerializedName("from_address") val fromAddress: String?,
    @SerializedName("to_address") val toAddress: String?,
    @SerializedName("amount") val amount: List<CoinDto>?
)

data class AuthInfoDto(
    @SerializedName("fee") val fee: FeeDto
)

data class FeeDto(
    @SerializedName("amount") val amount: List<CoinDto>,
    @SerializedName("gas_limit") val gasLimit: String
)

data class TxResponseDto(
    @SerializedName("height") val height: String,
    @SerializedName("txhash") val txHash: String,
    @SerializedName("code") val code: Int,
    @SerializedName("data") val data: String?,
    @SerializedName("raw_log") val rawLog: String,
    @SerializedName("gas_used") val gasUsed: String,
    @SerializedName("gas_wanted") val gasWanted: String,
    @SerializedName("timestamp") val timestamp: String
)

// ── Broadcast ─────────────────────────────────────────────────────────────────

data class BroadcastTxRequest(
    @SerializedName("tx_bytes") val txBytes: String,  // base64-encoded signed tx
    @SerializedName("mode") val mode: String = "BROADCAST_MODE_SYNC"
)

data class BroadcastTxResponse(
    @SerializedName("tx_response") val txResponse: TxResponseDto
)
