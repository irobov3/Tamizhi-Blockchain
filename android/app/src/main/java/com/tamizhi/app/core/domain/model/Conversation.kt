package com.tamizhi.app.core.domain.model

data class Conversation(
    val id: String,
    val localAddress: String,
    val remoteAddress: String,
    val remoteDisplayName: String,
    val lastMessagePreview: String,
    val lastMessageTimestamp: Long,
    val unreadCount: Int,
    val isPinned: Boolean,
    val isMuted: Boolean,
    val createdAt: Long
) {
    val avatarInitials: String
        get() = remoteDisplayName.take(2).uppercase()
            .ifEmpty { remoteAddress.take(2).uppercase() }

    val shortAddress: String
        get() = if (remoteAddress.length > 16)
            "${remoteAddress.take(8)}...${remoteAddress.takeLast(6)}"
        else remoteAddress
}
