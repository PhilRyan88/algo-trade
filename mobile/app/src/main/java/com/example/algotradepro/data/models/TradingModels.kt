package com.example.algotradepro.data.models

data class LoginRequest(
    val clientCode: String,
    val pin: String,
    val totpCode: String
)

data class LoginResponse(
    val success: Boolean,
    val message: String
)

data class AuthStatusResponse(
    val isAuthenticated: Boolean
)

data class LogoutResponse(
    val success: Boolean,
    val message: String
)

data class EngineStatusResponse(
    val success: Boolean,
    val isRunning: Boolean
)

data class StartStopResponse(
    val success: Boolean,
    val message: String
)

data class CapitalResponse(
    val success: Boolean,
    val data: CapitalData
)

data class CapitalData(
    val startingCapital: Double
)

data class UpdateCapitalRequest(
    val startingCapital: Double
)

data class Trade(
    val _id: String,
    val symbol: String,
    val type: String,
    val strategy: String,
    val entryPrice: Double,
    val exitPrice: Double?,
    val stopLoss: Double,
    val target: Double,
    val quantity: Int,
    val pnl: Double,
    val status: String,
    val confidence: Double,
    val mlScore: Double,
    val reason: String,
    val openedAt: String,
    val closedAt: String?
)

data class SummaryData(
    val totalTrades: Int,
    val openTrades: Int,
    val closedTrades: Int,
    val totalPnl: Double,
    val winCount: Int,
    val lossCount: Int,
    val winRate: String
)

data class TodayTradesData(
    val trades: List<Trade>,
    val summary: SummaryData
)

data class TodayTradesResponse(
    val success: Boolean,
    val data: TodayTradesData
)

data class StatsData(
    val totalTrades: Int,
    val totalPnl: Double,
    val startingBalance: Double,
    val currentBalance: Double,
    val winCount: Int,
    val lossCount: Int,
    val winRate: String,
    val avgWin: String,
    val avgLoss: String,
    val openTrades: Int
)

data class StatsResponse(
    val success: Boolean,
    val data: StatsData
)

data class MLStatusData(
    val isLoaded: Boolean,
    val lastAccuracy: Double,
    val lastLoss: Double,
    val samplesCount: Int
)

data class MLStatusResponse(
    val success: Boolean,
    val data: MLStatusData
)

data class DividendItem(
    val symbol: String,
    val purpose: String,
    val announcementDate: String,
    val recordDate: String?,
    val exDate: String?,
    val amount: Double?
)

data class BreakoutItem(
    val symbol: String,
    val close: Double,
    val volume: Double,
    val avgVolume: Double,
    val volumeRatio: Double,
    val rstd: Double
)

data class HistoricalCandle(
    val time: String,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Long
)

data class HistoricalResponse(
    val success: Boolean,
    val data: List<HistoricalCandle>
)

