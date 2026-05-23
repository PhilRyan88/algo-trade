package com.example.algotradepro.ui.screens

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.algotradepro.data.network.NetworkClient
import com.example.algotradepro.data.network.WebSocketService
import com.example.algotradepro.data.network.WsMessage
import com.example.algotradepro.ui.components.CandleData
import com.example.algotradepro.ui.components.CustomCandleChart
import com.example.algotradepro.theme.*
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun MarketDataScreen() {
    val coroutineScope = rememberCoroutineScope()
    var selectedSymbol by remember { mutableStateOf("NIFTY") } // "NIFTY" or "BANKNIFTY"
    var candles by remember { mutableStateOf<List<CandleData>>(emptyList()) }
    var ltp by remember { mutableStateOf(0.0) }
    var volume by remember { mutableStateOf(0L) }
    var isLoading by remember { mutableStateOf(false) }

    // Map token prefixes for matching tick data
    val targetToken = if (selectedSymbol == "NIFTY") "26000" else "26009"

    val fetchHistory = suspend {
        isLoading = true
        try {
            val response = NetworkClient.apiService.getHistoricalData(selectedSymbol)
            if (response.success) {
                // Parse date strings to HH:mm format
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val localDisplayFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

                candles = response.data.map { item ->
                    val displayStr = try {
                        val parsed = inputFormat.parse(item.time)
                        if (parsed != null) localDisplayFormat.format(parsed) else "00:00"
                    } catch (e: Exception) {
                        item.time.take(16).split("T").getOrNull(1) ?: "00:00"
                    }

                    CandleData(
                        time = item.time,
                        displayTime = displayStr,
                        open = item.open,
                        high = item.high,
                        low = item.low,
                        close = item.close,
                        volume = item.volume
                    )
                }

                if (candles.isNotEmpty()) {
                    ltp = candles.last().close
                    volume = candles.last().volume
                }
            }
        } catch (e: Exception) {
            Log.e("MarketDataScreen", "Error loading history: ${e.message}")
        } finally {
            isLoading = false
        }
    }

    // Refresh history when selected symbol changes
    LaunchedEffect(selectedSymbol) {
        fetchHistory()
    }

    // Listen to real-time tick aggregation via WebSocket
    LaunchedEffect(selectedSymbol) {
        WebSocketService.instance.connect()
        WebSocketService.instance.messages
            .filterIsInstance<WsMessage.MarketTick>()
            .collect { tick ->
                if (tick.token.contains(targetToken)) {
                    val currentPrice = tick.ltp
                    ltp = currentPrice
                    volume = tick.volume

                    // Aggregate tick into active candle
                    val now = Calendar.getInstance()
                    now.set(Calendar.SECOND, 0)
                    now.set(Calendar.MILLISECOND, 0)
                    
                    val displayTimeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                    val currentMinuteStr = displayTimeFormat.format(now.time)

                    val listCopy = candles.toMutableList()
                    if (listCopy.isNotEmpty()) {
                        val lastCandle = listCopy.last()
                        if (lastCandle.displayTime == currentMinuteStr) {
                            // Update active candle
                            lastCandle.close = currentPrice
                            lastCandle.high = maxOf(lastCandle.high, currentPrice)
                            lastCandle.low = minOf(lastCandle.low, currentPrice)
                            lastCandle.volume = tick.volume
                            listCopy[listCopy.size - 1] = lastCandle
                        } else {
                            // Minute boundary crossed: Append new candle
                            val newCandle = CandleData(
                                time = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                                    timeZone = TimeZone.getTimeZone("UTC")
                                }.format(now.time),
                                displayTime = currentMinuteStr,
                                open = currentPrice,
                                high = currentPrice,
                                low = currentPrice,
                                close = currentPrice,
                                volume = tick.volume
                            )
                            listCopy.add(newCandle)
                        }
                        
                        // Keep visible chart capped to 40 data points
                        candles = listCopy.takeLast(40)
                    } else {
                        // Edge case: Empty chart, initialize first point
                        candles = listOf(
                            CandleData(
                                time = "",
                                displayTime = currentMinuteStr,
                                open = currentPrice,
                                high = currentPrice,
                                low = currentPrice,
                                close = currentPrice,
                                volume = tick.volume
                            )
                        )
                    }
                }
            }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Heading Segment Selector Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Live Index Chart",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                // Glassmorphic Tab Selector
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0x13FFFFFF))
                        .border(1.dp, BorderGlass, RoundedCornerShape(12.dp))
                        .padding(3.dp)
                ) {
                    listOf("NIFTY", "BANKNIFTY").forEach { symbol ->
                        val isSelected = selectedSymbol == symbol
                        val bgCol = if (isSelected) PrimaryGreen else Color.Transparent
                        val textCol = if (isSelected) Color.Black else TextSecondary
                        val fontW = if (isSelected) FontWeight.Bold else FontWeight.Medium

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(bgCol)
                                .clickable { selectedSymbol = symbol }
                                .padding(horizontal = 14.dp, vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = symbol, color = textCol, fontSize = 12.sp, fontWeight = fontW)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Live Price display card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderGlass, RoundedCornerShape(20.dp)),
                colors = CardDefaults.cardColors(containerColor = CardGlassBg),
                shape = RoundedCornerShape(20.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = "$selectedSymbol SPOT", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "₹${String.format("%.2f", ltp)}",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextPrimary
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(text = "VOLUME", fontSize = 10.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = volume.toString(),
                            fontSize = 14.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = AccentBlue
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Chart Render Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(1.dp, BorderGlass, RoundedCornerShape(24.dp)),
                colors = CardDefaults.cardColors(containerColor = CardGlassBg),
                shape = RoundedCornerShape(24.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = PrimaryGreen)
                    } else if (candles.isEmpty()) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("No historical candle records.", color = TextSecondary, fontSize = 13.sp)
                        }
                    } else {
                        CustomCandleChart(
                            candles = candles,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
        }
    }
}
