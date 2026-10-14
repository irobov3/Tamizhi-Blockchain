package com.tamizhi.app.core.di

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import com.tamizhi.app.core.data.remote.api.BackendApi
import com.tamizhi.app.core.data.remote.api.ChainApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val CHAIN_BASE_URL = "https://rpc.tamizhi.ai/"
    private const val BACKEND_BASE_URL = "https://api.tamizhi.ai/"

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

    @Provides
    @Singleton
    @Named("auth")
    fun provideAuthInterceptor(
        dataStore: DataStore<Preferences>
    ): Interceptor = Interceptor { chain ->
        val token = runBlocking {
            dataStore.data.firstOrNull()?.get(stringPreferencesKey("auth_token"))
        }
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        chain.proceed(request)
    }

    @Provides
    @Singleton
    @Named("chain")
    fun provideChainOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        .build()

    @Provides
    @Singleton
    @Named("backend")
    fun provideBackendOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor,
        @Named("auth") authInterceptor: Interceptor
    ): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .build()

    @Provides
    @Singleton
    @Named("chain")
    fun provideChainRetrofit(
        @Named("chain") okHttpClient: OkHttpClient
    ): Retrofit = Retrofit.Builder()
        .baseUrl(CHAIN_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    @Provides
    @Singleton
    @Named("backend")
    fun provideBackendRetrofit(
        @Named("backend") okHttpClient: OkHttpClient
    ): Retrofit = Retrofit.Builder()
        .baseUrl(BACKEND_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    @Provides
    @Singleton
    fun provideChainApi(
        @Named("chain") retrofit: Retrofit
    ): ChainApi = retrofit.create(ChainApi::class.java)

    @Provides
    @Singleton
    fun provideBackendApi(
        @Named("backend") retrofit: Retrofit
    ): BackendApi = retrofit.create(BackendApi::class.java)
}
