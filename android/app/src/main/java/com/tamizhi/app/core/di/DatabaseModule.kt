package com.tamizhi.app.core.di

import android.content.Context
import androidx.room.Room
import com.tamizhi.app.core.data.local.TamizhiDatabase
import com.tamizhi.app.core.data.local.dao.MessageDao
import com.tamizhi.app.core.data.local.dao.WalletDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SupportFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideTamizhiDatabase(
        @ApplicationContext context: Context
    ): TamizhiDatabase = Room.databaseBuilder(
        context,
        TamizhiDatabase::class.java,
        TamizhiDatabase.DATABASE_NAME
    )
        .fallbackToDestructiveMigration()
        .build()

    @Provides
    fun provideWalletDao(db: TamizhiDatabase): WalletDao = db.walletDao()

    @Provides
    fun provideMessageDao(db: TamizhiDatabase): MessageDao = db.messageDao()
}
