package com.tamizhi.app.core.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.tamizhi.app.core.data.local.dao.MessageDao
import com.tamizhi.app.core.data.local.dao.WalletDao
import com.tamizhi.app.core.data.local.entities.ConversationEntity
import com.tamizhi.app.core.data.local.entities.MessageEntity
import com.tamizhi.app.core.data.local.entities.WalletEntity

@Database(
    entities = [
        WalletEntity::class,
        ConversationEntity::class,
        MessageEntity::class,
    ],
    version = 1,
    exportSchema = true
)
abstract class TamizhiDatabase : RoomDatabase() {
    abstract fun walletDao(): WalletDao
    abstract fun messageDao(): MessageDao

    companion object {
        const val DATABASE_NAME = "tamizhi.db"
    }
}
