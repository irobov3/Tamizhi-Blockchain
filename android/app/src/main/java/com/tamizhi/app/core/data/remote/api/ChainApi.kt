package com.tamizhi.app.core.data.remote.api

import com.tamizhi.app.core.data.remote.dto.BalanceResponse
import com.tamizhi.app.core.data.remote.dto.BroadcastTxRequest
import com.tamizhi.app.core.data.remote.dto.BroadcastTxResponse
import com.tamizhi.app.core.data.remote.dto.TxListResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ChainApi {

    @GET("cosmos/bank/v1beta1/balances/{address}")
    suspend fun getBalance(
        @Path("address") address: String
    ): BalanceResponse

    @GET("cosmos/tx/v1beta1/txs")
    suspend fun getTransactions(
        @Query("events") events: String,
        @Query("pagination.limit") limit: Int = 50,
        @Query("pagination.offset") offset: Int = 0,
        @Query("order_by") orderBy: String = "ORDER_BY_DESC"
    ): TxListResponse

    @POST("cosmos/tx/v1beta1/txs")
    suspend fun broadcastTx(
        @Body request: BroadcastTxRequest
    ): BroadcastTxResponse

    @GET("cosmos/bank/v1beta1/supply")
    suspend fun getTotalSupply(): BalanceResponse

    @GET("cosmos/base/tendermint/v1beta1/blocks/latest")
    suspend fun getLatestBlock(): retrofit2.Response<okhttp3.ResponseBody>
}
