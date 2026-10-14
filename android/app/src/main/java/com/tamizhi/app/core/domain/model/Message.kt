package com.tamizhi.app.core.domain.model

data class Message(
    val id: String,
    val conversationId: String,
    val fromAddress: String,
    val toAddress: String,
    val content: String,             // decrypted plaintext
    val encryptedContent: String,    // raw encrypted form
    val timestamp: Long,
    val localTimestamp: Long,
    val status: MessageStatus,
    val messageType: MessageType,
    val mediaUri: String? = null,
    val replyToId: String? = null,
    val isMine: Boolean = false
)

enum class MessageStatus {
    SENDING,
    SENT,
    DELIVERED,
    READ,
    FAILED;

    companion object {
        fun fromString(s: String): MessageStatus = when (s.uppercase()) {
            "SENDING" -> SENDING
            "SENT" -> SENT
            "DELIVERED" -> DELIVERED
            "READ" -> READ
            else -> FAILED
        }
    }
}

enum class MessageType {
    TEXT,
    IMAGE,
    FILE;

    companion object {
        fun fromString(s: String): MessageType = when (s.uppercase()) {
            "IMAGE" -> IMAGE
            "FILE" -> FILE
            else -> TEXT
        }
    }
}
