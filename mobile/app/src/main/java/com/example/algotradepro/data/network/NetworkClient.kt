package com.example.algotradepro.data.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkClient {
    private var currentBaseUrl = "http://10.0.2.2:5000/api/" // Default for Android Emulator loopback
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private var client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    private var retrofit = Retrofit.Builder()
        .baseUrl(currentBaseUrl)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    var apiService: ApiService = retrofit.create(ApiService::class.java)
        private set

    fun getBaseUrl(): String = currentBaseUrl

    fun getHostIp(): String {
        // Strip http:// and :5000/api/
        return currentBaseUrl
            .replace("http://", "")
            .replace("/api/", "")
            .split(":")[0]
    }

    fun updateBaseUrl(newIpOrUrl: String) {
        val formattedUrl = when {
            newIpOrUrl.startsWith("http://") || newIpOrUrl.startsWith("https://") -> {
                if (newIpOrUrl.endsWith("/")) newIpOrUrl else "$newIpOrUrl/"
            }
            newIpOrUrl.contains(":") -> "http://$newIpOrUrl/api/"
            else -> "http://$newIpOrUrl:5000/api/"
        }
        currentBaseUrl = formattedUrl
        
        retrofit = Retrofit.Builder()
            .baseUrl(currentBaseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            
        apiService = retrofit.create(ApiService::class.java)
    }
}
