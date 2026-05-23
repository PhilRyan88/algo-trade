package com.example.algotradepro.data.network

import com.example.algotradepro.data.models.*
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("auth/status")
    suspend fun checkStatus(): AuthStatusResponse

    @POST("auth/logout")
    suspend fun logout(): LogoutResponse

    @GET("trades/stats")
    suspend fun getStats(): StatsResponse

    @GET("trades/today")
    suspend fun getTodayTrades(): TodayTradesResponse

    @GET("trades/history")
    suspend fun getTradeHistory(@Query("limit") limit: Int): TodayTradesResponse

    @GET("trades/engine/status")
    suspend fun getEngineStatus(): EngineStatusResponse

    @POST("trades/engine/start")
    suspend fun startEngine(): StartStopResponse

    @POST("trades/engine/stop")
    suspend fun stopEngine(): StartStopResponse

    @GET("trades/settings")
    suspend fun getSettings(): CapitalResponse

    @POST("trades/settings")
    suspend fun updateSettings(@Body request: UpdateCapitalRequest): StartStopResponse

    @GET("trades/ml/status")
    suspend fun getMlStatus(): MLStatusResponse

    @POST("trades/ml/train/backtest")
    suspend fun trainModel(): StartStopResponse

    @GET("market/historical/{symbol}")
    suspend fun getHistoricalData(
        @retrofit2.http.Path("symbol") symbol: String
    ): HistoricalResponse


    @GET("dividends")
    suspend fun getDividends(
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): List<DividendItem>

    @GET("breakout")
    suspend fun getBreakouts(): List<BreakoutItem>
}
