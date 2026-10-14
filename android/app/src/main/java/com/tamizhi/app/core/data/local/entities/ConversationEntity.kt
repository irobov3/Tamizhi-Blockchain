package com.tamizhi.app.core.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey val id: String,
    val localAddress: String,         // our wallet address
    val remoteAddress: String,        // counterparty wallet address
    val remoteDisplayName: String,    // alias or truncated address
    val lastMessagePreview: String,   // decrypted preview (first 80 chars)
    val lastMessageTimestamp: Long,   // epoch millis
    val unreadCount: Int,
    val isPinned: Boolean,
    val isMuted: Boolean,
    val createdAt: Long               // epoch millis
)
