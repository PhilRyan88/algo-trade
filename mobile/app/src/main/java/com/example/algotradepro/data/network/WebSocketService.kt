package com.example.algotradepro.data.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.*
import java.util.concurrent.TimeUnit

class WebSocketService private constructor() {
    private val client = OkHttpClient.Builder()
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _messages = MutableSharedFlow<WsMessage>(extraBufferCapacity = 100)
    val messages: SharedFlow<WsMessage> = _messages.asSharedFlow()

    private var isConnected = false
    private var reconnectJob: Job? = null

    companion object {
        private val TAG = "WebSocketService"
        val instance by lazy { WebSocketService() }
    }

    fun connect() {
        if (isConnected) return
        
        val ip = NetworkClient.getHostIp()
        val wsUrl = "ws://$ip:5000/api/ws"
        Log.d(TAG, "Connecting to WebSocket: $wsUrl")

        val request = Request.Builder().url(wsUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket Opened")
                isConnected = true
                reconnectJob?.cancel()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val root = gson.fromJson(text, JsonObject::class.java)
                    val type = root.get("type")?.asString
                    val data = root.get("data")
                    if (type != null && data != null) {
                        scope.launch {
                            when (type) {
                                "market_data" -> {
                                    val token = data.asJsonObject.get("token")?.asString ?: ""
                                    
                                    // Parse LTP - handle both paisa Conversion (raw_ltp or last_traded_price or ltp)
                                    val rawLtp = data.asJsonObject.get("last_traded_price")?.asDouble 
                                        ?: data.asJsonObject.get("ltp")?.asDouble ?: 0.0
                                    val ltp = rawLtp / 100.0 // Paisa to Rupees
                                    
                                    val volume = data.asJsonObject.get("volume_traded")?.asLong
                                        ?: data.asJsonObject.get("v")?.asLong ?: 0L
                                    
                                    _messages.emit(WsMessage.MarketTick(token, ltp, volume))
                                }
                                "strategy_log" -> {
                                    val log = gson.fromJson(data, StrategyLogData::class.java)
                                    _messages.emit(WsMessage.StrategyLog(log))
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing WebSocket message: ${e.message}")
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket Closing: $reason")
                isConnected = false
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket Closed: $reason")
                isConnected = false
                triggerReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket Failure: ${t.message}")
                isConnected = false
                triggerReconnect()
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "User initiated disconnect")
        isConnected = false
        reconnectJob?.cancel()
    }

    private fun triggerReconnect() {
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(5000)
            Log.d(TAG, "Attempting WebSocket reconnect...")
            connect()
        }
    }
}

sealed class WsMessage {
    data class MarketTick(val token: String, val ltp: Double, val volume: Long) : WsMessage()
    data class StrategyLog(val log: StrategyLogData) : WsMessage()
}

data class StrategyLogData(
    val timestamp: String,
    val symbol: String,
    val spotPrice: Double,
    val optionStrike: String?,
    val optionType: String?,
    val vwap: Double,
    val ema9: Double,
    val rsi: Double,
    val atr: Double,
    val volume: Double,
    val score: Double,
    val signalGenerated: String,
    val rejectedReason: String?,
    val positionState: String?
)
