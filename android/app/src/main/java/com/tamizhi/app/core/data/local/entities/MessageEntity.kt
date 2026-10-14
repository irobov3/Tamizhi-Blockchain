package com.tamizhi.app.core.data.local.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "messages",
    foreignKeys = [
        ForeignKey(
            entity = ConversationEntity::class,
            parentColumns = ["id"],
            childColumns = ["conversationId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index("conversationId"),
        Index("timestamp")
    ]
)
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val fromAddress: String,
    val toAddress: String,
    val encryptedContent: String,     // NaCl box ciphertext (base64)
    val decryptedContent: String?,    // cached plaintext after decrypt; null if not yet decrypted
    val timestamp: Long,              // epoch millis (server-assigned)
    val localTimestamp: Long,         // epoch millis (device clock, for optimistic UI)
    val status: String,               // SENDING | SENT | DELIVERED | READ | FAILED
    val messageType: String,          // TEXT | IMAGE | FILE
    val mediaUri: String?,            // local URI for images/files
    val replyToId: String?            // quoted message id
)
