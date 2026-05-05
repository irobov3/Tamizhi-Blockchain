package com.tamizhi.app.core.data.remote.dto

import com.google.gson.annotations.SerializedName

// ── Auth ──────────────────────────────────────────────────────────────────────

data class AuthNonceResponse(
    @SerializedName("nonce") val nonce: String,
    @SerializedName("expires_at") val expiresAt: Long
)

data class AuthVerifyRequest(
    @SerializedName("address") val address: String,
    @SerializedName("nonce") val nonce: String,
    @SerializedName("signature") val signature: String,   // hex-encoded
    @SerializedName("public_key") val publicKey: String   // hex-encoded
)

data class AuthVerifyResponse(
    @SerializedName("token") val token: String,
    @SerializedName("refresh_token") val refreshToken: String,
    @SerializedName("expires_in") val expiresIn: Long
)

// ── Literature ────────────────────────────────────────────────────────────────

data class LiteratureListResponse(
    @SerializedName("items") val items: List<LiteratureDto>,
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int
)

data class LiteratureDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("title_ta") val titleTa: String,
    @SerializedName("author") val author: String,
    @SerializedName("author_ta") val authorTa: String,
    @SerializedName("category") val category: String,     // THIRUKURAL | SANGAM | EPIC | DEVOTIONAL | MODERN
    @SerializedName("era") val era: String,
    @SerializedName("verse_count") val verseCount: Int,
    @SerializedName("thumbnail_url") val thumbnailUrl: String?,
    @SerializedName("summary") val summary: String,
    @SerializedName("summary_ta") val summaryTa: String
)

data class LiteratureDetailDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("title_ta") val titleTa: String,
    @SerializedName("author") val author: String,
    @SerializedName("author_ta") val authorTa: String,
    @SerializedName("category") val category: String,
    @SerializedName("era") val era: String,
    @SerializedName("verses") val verses: List<VerseDto>,
    @SerializedName("commentary") val commentary: String?,
    @SerializedName("commentary_ta") val commentaryTa: String?
)

data class VerseDto(
    @SerializedName("number") val number: Int,
    @SerializedName("text_ta") val textTa: String,        // original Tamil
    @SerializedName("transliteration") val transliteration: String,
    @SerializedName("translation_en") val translationEn: String,
    @SerializedName("chapter") val chapter: String?,
    @SerializedName("chapter_ta") val chapterTa: String?
)

// ── Messages ──────────────────────────────────────────────────────────────────

data class MessageDto(
    @SerializedName("id") val id: String,
    @SerializedName("conversation_id") val conversationId: String,
    @SerializedName("from_address") val fromAddress: String,
    @SerializedName("to_address") val toAddress: String,
    @SerializedName("encrypted_content") val encryptedContent: String,  // base64 NaCl box
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("status") val status: String,
    @SerializedName("message_type") val messageType: String
)

data class SendMessageRequest(
    @SerializedName("conversation_id") val conversationId: String,
    @SerializedName("to_address") val toAddress: String,
    @SerializedName("encrypted_content") val encryptedContent: String,
    @SerializedName("message_type") val messageType: String = "TEXT"
)

data class SendMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("status") val status: String
)

// ── AI Chat ───────────────────────────────────────────────────────────────────

data class AiChatRequest(
    @SerializedName("message") val message: String,
    @SerializedName("language") val language: String = "ta",   // "ta" | "en"
    @SerializedName("context") val context: String? = null
)

data class AiChatResponse(
    @SerializedName("reply") val reply: String,
    @SerializedName("reply_ta") val replyTa: String?,
    @SerializedName("sources") val sources: List<String>?
)
