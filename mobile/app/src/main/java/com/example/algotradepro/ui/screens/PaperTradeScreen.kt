package com.example.algotradepro.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.algotradepro.data.models.StatsData
import com.example.algotradepro.data.models.Trade
import com.example.algotradepro.data.models.UpdateCapitalRequest
import com.example.algotradepro.data.network.NetworkClient
import com.example.algotradepro.data.network.StrategyLogData
import com.example.algotradepro.data.network.WebSocketService
import com.example.algotradepro.data.network.WsMessage
import com.example.algotradepro.theme.*
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch

@Composable
fun PaperTradeScreen() {
    val coroutineScope = rememberCoroutineScope()
    
    var stats by remember { mutableStateOf<StatsData?>(null) }
    var todayTrades by remember { mutableStateOf<List<Trade>>(emptyList()) }
    var strategyLogs by remember { mutableStateOf<List<StrategyLogData>>(emptyList()) }
    var mlLoaded by remember { mutableStateOf(false) }
    var mlAccuracy by remember { mutableStateOf(0.0) }
    var mlSamples by remember { mutableStateOf(0) }
    
    var showCapitalDialog by remember { mutableStateOf(false) }
    var capitalInput by remember { mutableStateOf("15000") }

    var isRefreshing by remember { mutableStateOf(false) }

    val loadData = suspend {
        try {
            val statsRes = NetworkClient.apiService.getStats()
            if (statsRes.success) {
                stats = statsRes.data
                capitalInput = statsRes.data.startingBalance.toInt().toString()
            }
            
            val tradesRes = NetworkClient.apiService.getTodayTrades()
            if (tradesRes.success) {
                todayTrades = tradesRes.data.trades
            }
            
            val mlRes = NetworkClient.apiService.getMlStatus()
            if (mlRes.success) {
                mlLoaded = mlRes.data.isLoaded
                mlAccuracy = mlRes.data.lastAccuracy
                mlSamples = mlRes.data.samplesCount
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // Connect to WebSocket & Listen to Strategy Logs
    LaunchedEffect(Unit) {
        loadData()
        
        WebSocketService.instance.connect()
        WebSocketService.instance.messages
            .filterIsInstance<WsMessage.StrategyLog>()
            .collect { message ->
                // Prepend new strategy log to display top-first
                strategyLogs = (listOf(message.log) + strategyLogs).take(30)
                
                // Refresh portfolio trades & statistics automatically on ticks/exits
                loadData()
            }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 80.dp)
        ) {
            // Portfolio Summary Header
            item {
                Text(
                    text = "Paper Portfolio",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Stats Cards Row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Total PnL Card
                    val totalPnl = stats?.totalPnl ?: 0.0
                    val isProfit = totalPnl >= 0.0
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .height(100.dp)
                            .border(1.dp, BorderGlass, RoundedCornerShape(20.dp)),
                        colors = CardDefaults.cardColors(containerColor = CardGlassBg),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("TOTAL PNL", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = if (isProfit) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                    contentDescription = null,
                                    tint = if (isProfit) PrimaryGreen else PrimaryRed,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "₹${String.format("%.2f", totalPnl)}",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isProfit) PrimaryGreen else PrimaryRed
                                )
                            }
                        }
                    }

                    // Win Rate Card
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .height(100.dp)
                            .border(1.dp, BorderGlass, RoundedCornerShape(20.dp)),
                        colors = CardDefaults.cardColors(containerColor = CardGlassBg),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("WIN RATE", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                            Text(
                                text = "${stats?.winRate ?: "0.0"}%",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = AccentBlue
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Balance & Capital Card (Interactive)
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderGlass, RoundedCornerShape(20.dp))
                        .clickable { showCapitalDialog = true },
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
                            Text("AVAILABLE BALANCE", fontSize = 11.sp, color = TextSecondary, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "₹${String.format("%.2f", stats?.currentBalance ?: 0.0)}",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Starting: ₹${stats?.startingBalance?.toInt() ?: 15000}",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                        
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0x13FFFFFF))
                                .border(1.dp, BorderGlass, RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit Capital", tint = TextPrimary, modifier = Modifier.size(18.dp))
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Continuous ML badge
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0x338B5CF6), RoundedCornerShape(20.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color(0x068B5CF6)),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(RoundedCornerShape(5.dp))
                                    .background(if (mlLoaded) PrimaryGreen else AmberGold)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text("Online NN Engine", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text(
                                    text = if (mlLoaded) "Active - Acc: ${String.format("%.1f", mlAccuracy * 100)}% (${mlSamples} samples)" else "Training...",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }
                        }
                        
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    try {
                                        NetworkClient.apiService.trainModel()
                                    } catch (e: Exception) {}
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = VioletPurple),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text("RE-TRAIN", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
            }

            // Real-Time Strategy Scanner Activity Logs
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Real-Time Strategy Feed",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    
                    Text(
                        text = "• LIVE FEED",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryGreen,
                        letterSpacing = 1.sp
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
            }

            if (strategyLogs.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderGlass, RoundedCornerShape(20.dp)),
                        colors = CardDefaults.cardColors(containerColor = CardGlassBg),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(36.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Refresh, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(28.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Awaiting strategy scan ticks...", fontSize = 13.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            } else {
                items(strategyLogs) { log ->
                    LogCard(log)
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }

        // Custom Glassmorphic Starting Capital Dialog
        if (showCapitalDialog) {
            AlertDialog(
                onDismissRequest = { showCapitalDialog = false },
                title = { Text("Update Starting Capital", color = TextPrimary, fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text("Enter the trade balance allocation below:", color = TextSecondary, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = capitalInput,
                            onValueChange = { capitalInput = it },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = PrimaryGreen,
                                unfocusedBorderColor = BorderGlass
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val cap = capitalInput.toDoubleOrNull() ?: 15000.0
                            coroutineScope.launch {
                                try {
                                    NetworkClient.apiService.updateSettings(UpdateCapitalRequest(cap))
                                    loadData()
                                } catch (e: Exception) {}
                                showCapitalDialog = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen)
                    ) {
                        Text("Save", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showCapitalDialog = false }) {
                        Text("Cancel", color = TextSecondary)
                    }
                },
                containerColor = SurfaceDark,
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.border(1.dp, BorderGlass, RoundedCornerShape(24.dp))
            )
        }
    }
}

@Composable
fun LogCard(log: StrategyLogData) {
    val qualifies = log.score >= 70
    val borderCol = if (qualifies) Color(0x3322C55E) else BorderGlass
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderCol, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = CardGlassBg),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = log.symbol,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = log.timestamp.split("T").getOrElse(1) { "" }.take(8),
                        fontSize = 11.sp,
                        color = TextSecondary,
                        fontFamily = FontFamily.Monospace
                    )
                }
                
                // Score Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (qualifies) Color(0x1A22C55E) else Color(0x13FFFFFF))
                        .border(1.dp, if (qualifies) Color(0x3322C55E) else BorderGlass, RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Score: ${log.score.toInt()}/100",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (qualifies) PrimaryGreen else TextPrimary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(10.dp))
            
            // Metrics Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                MetricColumn("Spot", "₹${log.spotPrice.toInt()}")
                MetricColumn("VWAP", "₹${log.vwap.toInt()}")
                MetricColumn("EMA9", "₹${log.ema9.toInt()}")
                MetricColumn("RSI", log.rsi.toInt().toString())
            }
            
            Spacer(modifier = Modifier.height(8.dp))

            // Reason / Signal details
            if (!log.rejectedReason.isNullOrBlank()) {
                Text(
                    text = "Rejected: ${log.rejectedReason}",
                    fontSize = 12.sp,
                    color = PrimaryRed,
                    fontWeight = FontWeight.Medium
                )
            } else if (!log.positionState.isNullOrBlank()) {
                Text(
                    text = "Signal: ${log.signalGenerated} | Status: ${log.positionState}",
                    fontSize = 12.sp,
                    color = PrimaryGreen,
                    fontWeight = FontWeight.SemiBold
                )
            } else {
                Text(
                    text = "Signal: ${log.signalGenerated}",
                    fontSize = 12.sp,
                    color = if (qualifies) PrimaryGreen else TextSecondary,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun MetricColumn(label: String, value: String) {
    Column {
        Text(label, fontSize = 10.sp, color = TextSecondary)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
    }
}
