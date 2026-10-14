package com.tamizhi.app.core.data.remote.api

import com.tamizhi.app.core.data.remote.dto.AiChatRequest
import com.tamizhi.app.core.data.remote.dto.AiChatResponse
import com.tamizhi.app.core.data.remote.dto.AuthNonceResponse
import com.tamizhi.app.core.data.remote.dto.AuthVerifyRequest
import com.tamizhi.app.core.data.remote.dto.AuthVerifyResponse
import com.tamizhi.app.core.data.remote.dto.LiteratureDetailDto
import com.tamizhi.app.core.data.remote.dto.LiteratureListResponse
import com.tamizhi.app.core.data.remote.dto.MessageDto
import com.tamizhi.app.core.data.remote.dto.SendMessageRequest
import com.tamizhi.app.core.data.remote.dto.SendMessageResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface BackendApi {

    // ── Auth ──────────────────────────────────────────────────────────────────

    @GET("auth/nonce/{address}")
    suspend fun getNonce(
        @Path("address") address: String
    ): AuthNonceResponse

    @POST("auth/verify")
    suspend fun verifySignature(
        @Body request: AuthVerifyRequest
    ): AuthVerifyResponse

    // ── Literature ────────────────────────────────────────────────────────────

    @GET("literature")
    suspend fun getLiteratureList(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category") category: String? = null,
        @Query("query") query: String? = null
    ): LiteratureListResponse

    @GET("literature/{id}")
    suspend fun getLiteratureDetail(
        @Path("id") id: String
    ): LiteratureDetailDto

    // ── Messages ──────────────────────────────────────────────────────────────

    @GET("messages/{conversationId}")
    suspend fun getMessages(
        @Path("conversationId") conversationId: String,
        @Query("since") sinceTimestamp: Long? = null,
        @Query("limit") limit: Int = 50
    ): List<MessageDto>

    @POST("messages")
    suspend fun sendMessage(
        @Body request: SendMessageRequest
    ): SendMessageResponse

    @POST("messages/{id}/read")
    suspend fun markMessageRead(
        @Path("id") messageId: String
    ): Unit

    // ── AI Chat ───────────────────────────────────────────────────────────────

    @POST("ai/chat")
    suspend fun sendAiChat(
        @Body request: AiChatRequest
    ): AiChatResponse

    @GET("ai/suggestions")
    suspend fun getAiSuggestions(
        @Query("context") context: String
    ): List<String>
}
