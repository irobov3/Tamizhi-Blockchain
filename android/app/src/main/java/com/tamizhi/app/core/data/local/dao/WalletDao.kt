package com.tamizhi.app.core.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.tamizhi.app.core.data.local.entities.WalletEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WalletDao {

    @Query("SELECT * FROM wallets WHERE isActive = 1 LIMIT 1")
    fun getActiveWallet(): Flow<WalletEntity?>

    @Query("SELECT * FROM wallets WHERE isActive = 1 LIMIT 1")
    suspend fun getActiveWalletOnce(): WalletEntity?

    @Query("SELECT * FROM wallets ORDER BY createdAt ASC")
    fun getAllWallets(): Flow<List<WalletEntity>>

    @Query("SELECT * FROM wallets WHERE address = :address LIMIT 1")
    suspend fun getWallet(address: String): WalletEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWallet(wallet: WalletEntity)

    @Query("UPDATE wallets SET isActive = 0")
    suspend fun deactivateAll()

    @Query("UPDATE wallets SET isActive = 1 WHERE address = :address")
    suspend fun activateWallet(address: String)

    @Transaction
    suspend fun setActiveWallet(address: String) {
        deactivateAll()
        activateWallet(address)
    }

    @Query("UPDATE wallets SET label = :label WHERE address = :address")
    suspend fun updateLabel(address: String, label: String)

    @Query("DELETE FROM wallets WHERE address = :address")
    suspend fun deleteWallet(address: String)

    @Query("SELECT COUNT(*) FROM wallets")
    suspend fun walletCount(): Int
}
