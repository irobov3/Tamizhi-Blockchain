package com.tamizhi.app.core.domain.repository

import com.tamizhi.app.core.domain.model.Conversation
import com.tamizhi.app.core.domain.model.Message
import kotlinx.coroutines.flow.Flow

interface MessageRepository {

    /** Observe all conversations, sorted pinned-first then by latest message. */
    fun getConversations(): Flow<List<Conversation>>

    /** Observe messages in a specific conversation, ascending by timestamp. */
    fun getMessages(conversationId: String): Flow<List<Message>>

    /**
     * Send a message. Handles:
     * 1. NaCl box encryption with recipient's X25519 key
     * 2. Optimistic local insert (status = SENDING)
     * 3. POST to backend
     * 4. Status update to SENT or FAILED
     */
    suspend fun sendMessage(
        conversationId: String,
        fromAddress: String,
        toAddress: String,
        content: String
    ): Result<Message>

    /** Mark all messages in a conversation as READ locally and on the server. */
    suspend fun markConversationRead(conversationId: String)

    /** Delete a single message locally. */
    suspend fun deleteMessage(messageId: String)

    /** Delete an entire conversation and all its messages. */
    suspend fun deleteConversation(conversationId: String)

    /**
     * Pull new messages from the backend since [sinceTimestamp].
     * Decrypts and stores them locally.
     */
    suspend fun syncMessages(conversationId: String, sinceTimestamp: Long): Result<Int>

    /** Create or retrieve a conversation with the given remote address. */
    suspend fun getOrCreateConversation(
        localAddress: String,
        remoteAddress: String
    ): Conversation
}
