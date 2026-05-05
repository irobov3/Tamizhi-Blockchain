package com.tamizhi.app.core.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.tamizhi.app.core.data.local.entities.ConversationEntity
import com.tamizhi.app.core.data.local.entities.MessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {

    // ── Conversations ─────────────────────────────────────────────────────────

    @Query("""
        SELECT * FROM conversations
        ORDER BY isPinned DESC, lastMessageTimestamp DESC
    """)
    fun getConversations(): Flow<List<ConversationEntity>>

    @Query("SELECT * FROM conversations WHERE id = :conversationId LIMIT 1")
    suspend fun getConversation(conversationId: String): ConversationEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversation(conversation: ConversationEntity)

    @Update
    suspend fun updateConversation(conversation: ConversationEntity)

    @Query("DELETE FROM conversations WHERE id = :conversationId")
    suspend fun deleteConversation(conversationId: String)

    @Query("""
        UPDATE conversations
        SET lastMessagePreview = :preview, lastMessageTimestamp = :timestamp
        WHERE id = :conversationId
    """)
    suspend fun updateConversationLastMessage(
        conversationId: String,
        preview: String,
        timestamp: Long
    )

    @Query("""
        UPDATE conversations
        SET unreadCount = unreadCount + 1
        WHERE id = :conversationId
    """)
    suspend fun incrementUnread(conversationId: String)

    @Query("""
        UPDATE conversations
        SET unreadCount = 0
        WHERE id = :conversationId
    """)
    suspend fun clearUnread(conversationId: String)

    // ── Messages ──────────────────────────────────────────────────────────────

    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        ORDER BY timestamp ASC
    """)
    fun getMessages(conversationId: String): Flow<List<MessageEntity>>

    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getMessagesPaged(
        conversationId: String,
        limit: Int,
        offset: Int
    ): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE id = :id LIMIT 1")
    suspend fun getMessage(id: String): MessageEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<MessageEntity>)

    @Query("UPDATE messages SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: String, status: String)

    @Query("""
        UPDATE messages
        SET decryptedContent = :decryptedContent
        WHERE id = :id
    """)
    suspend fun updateDecryptedContent(id: String, decryptedContent: String)

    @Query("""
        UPDATE messages
        SET status = 'READ'
        WHERE conversationId = :conversationId AND status != 'READ'
    """)
    suspend fun markRead(conversationId: String)

    @Query("DELETE FROM messages WHERE id = :id")
    suspend fun deleteMessage(id: String)

    @Query("DELETE FROM messages WHERE conversationId = :conversationId")
    suspend fun deleteAllMessagesInConversation(conversationId: String)

    @Transaction
    suspend fun insertMessageAndUpdateConversation(
        message: MessageEntity,
        preview: String
    ) {
        insertMessage(message)
        updateConversationLastMessage(
            conversationId = message.conversationId,
            preview = preview,
            timestamp = message.timestamp
        )
    }
}
