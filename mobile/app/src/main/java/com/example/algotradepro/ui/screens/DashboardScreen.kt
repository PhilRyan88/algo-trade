package com.example.algotradepro.ui.screens

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.algotradepro.data.network.NetworkClient
import com.example.algotradepro.data.network.WebSocketService
import com.example.algotradepro.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onLogout: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var selectedTab by remember { mutableStateOf(0) }
    var isEngineRunning by remember { mutableStateOf(false) }
    var isWsConnected by remember { mutableStateOf(true) }

    // Fetch initial engine status
    LaunchedEffect(Unit) {
        try {
            val response = NetworkClient.apiService.getEngineStatus()
            if (response.success) {
                isEngineRunning = response.isRunning
            }
        } catch (e: Exception) {}
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Pulsing connection dot
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (isWsConnected) PrimaryGreen else PrimaryRed)
                        )
                        Text(
                            text = "ALGO TRADE",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary,
                            letterSpacing = 1.sp
                        )
                    }
                },
                actions = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        // Engine Label
                        Text(
                            text = if (isEngineRunning) "ENGINE ON" else "ENGINE OFF",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isEngineRunning) PrimaryGreen else TextSecondary
                        )

                        // Engine Control Switch Toggle
                        Switch(
                            checked = isEngineRunning,
                            onCheckedChange = { checked ->
                                isEngineRunning = checked
                                coroutineScope.launch {
                                    try {
                                        if (checked) {
                                            NetworkClient.apiService.startEngine()
                                        } else {
                                            NetworkClient.apiService.stopEngine()
                                        }
                                    } catch (e: Exception) {
                                        // Revert state if failed
                                        isEngineRunning = !checked
                                    }
                                }
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.Black,
                                checkedTrackColor = PrimaryGreen,
                                uncheckedThumbColor = TextSecondary,
                                uncheckedTrackColor = Color(0x1AFFFFFF)
                            ),
                            modifier = Modifier.scale(0.8f)
                        )
                        
                        // Logout Action Button
                        IconButton(
                            onClick = {
                                coroutineScope.launch {
                                    try {
                                        NetworkClient.apiService.logout()
                                        WebSocketService.instance.disconnect()
                                    } catch (e: Exception) {}
                                    onLogout()
                                }
                            }
                        ) {
                            Icon(Icons.Default.ExitToApp, contentDescription = "Logout", tint = PrimaryRed)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = CardGlassBg,
                    titleContentColor = TextPrimary
                ),
                modifier = Modifier.border(0.dp, BorderGlass) // Translucent bottom border
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = CardGlassBg,
                tonalElevation = 0.dp,
                modifier = Modifier
                    .border(1.dp, BorderGlass, RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                    .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.TrendingUp, contentDescription = "Paper Trade") },
                    label = { Text("Paper Trade", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = PrimaryGreen,
                        selectedTextColor = PrimaryGreen,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = Color.Transparent
                    )
                )
                
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.BarChart, contentDescription = "Market Data") },
                    label = { Text("Market", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = PrimaryGreen,
                        selectedTextColor = PrimaryGreen,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = Color.Transparent
                    )
                )
                
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.DateRange, contentDescription = "Dividends") },
                    label = { Text("Dividends", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = PrimaryGreen,
                        selectedTextColor = PrimaryGreen,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = Color.Transparent
                    )
                )

                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.List, contentDescription = "Breakouts") },
                    label = { Text("Breakouts", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = PrimaryGreen,
                        selectedTextColor = PrimaryGreen,
                        unselectedIconColor = TextSecondary,
                        unselectedTextColor = TextSecondary,
                        indicatorColor = Color.Transparent
                    )
                )
            }
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(BackgroundDark)
        ) {
            Crossfade(targetState = selectedTab, label = "tabCrossfade") { tab ->
                when (tab) {
                    0 -> PaperTradeScreen()
                    1 -> MarketDataScreen()
                    2 -> DividendsScreen()
                    3 -> BreakoutsScreen()
                }
            }
        }
    }
}
