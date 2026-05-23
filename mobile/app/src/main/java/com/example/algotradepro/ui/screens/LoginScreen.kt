package com.example.algotradepro.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Warning
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.algotradepro.data.models.LoginRequest
import com.example.algotradepro.data.network.NetworkClient
import com.example.algotradepro.theme.*
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var clientCode by remember { mutableStateOf("") }
    var securePin by remember { mutableStateOf("") }
    var totpCode by remember { mutableStateOf("") }
    
    var ipInput by remember { mutableStateOf(NetworkClient.getHostIp()) }
    var showIpSettings by remember { mutableStateOf(false) }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark),
        contentAlignment = Alignment.Center
    ) {
        // Glowing background accent blobs (ambient light)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(Color(0x0C22C55E), Color.Transparent),
                        radius = 1200f
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .safeDrawingPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Section - Title
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 40.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0x4D22C55E), Color(0x0F22C55E))
                            )
                        )
                        .border(1.dp, Color(0x3322C55E), RoundedCornerShape(24.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Shield",
                        tint = PrimaryGreen,
                        modifier = Modifier.size(36.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Algo Trade Login",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    letterSpacing = (-0.5).sp
                )
                
                Spacer(modifier = Modifier.height(6.dp))
                
                Text(
                    text = "Verify identity via secure credentials",
                    fontSize = 14.sp,
                    color = TextSecondary,
                    textAlign = TextAlign.Center
                )
            }

            // Middle Section - Glassmorphic Credentials Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .wrapContentHeight()
                    .border(1.dp, BorderGlass, RoundedCornerShape(32.dp)),
                colors = CardDefaults.cardColors(containerColor = CardGlassBg),
                shape = RoundedCornerShape(32.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Error Notice Box
                    AnimatedVisibility(
                        visible = errorMessage != null,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        errorMessage?.let { error ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Color(0x1AEF4444))
                                    .border(1.dp, Color(0x33EF4444), RoundedCornerShape(16.dp))
                                    .padding(12.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = "Error",
                                        tint = PrimaryRed,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = error,
                                        color = PrimaryRed,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }

                    // Client ID Input
                    OutlinedTextField(
                        value = clientCode,
                        onValueChange = { clientCode = it.uppercase() },
                        label = { Text("Client Code", color = TextSecondary) },
                        placeholder = { Text("Angel One ID", color = Color.Gray) },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = "User", tint = TextSecondary) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = PrimaryGreen,
                            unfocusedBorderColor = BorderGlass,
                            focusedContainerColor = Color.Black.copy(alpha = 0.3f),
                            unfocusedContainerColor = Color.Black.copy(alpha = 0.3f)
                        ),

                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // PIN Input
                    OutlinedTextField(
                        value = securePin,
                        onValueChange = { securePin = it },
                        label = { Text("Secure PIN", color = TextSecondary) },
                        placeholder = { Text("4-digit PIN", color = Color.Gray) },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = "Lock", tint = TextSecondary) },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = PrimaryGreen,
                            unfocusedBorderColor = BorderGlass,
                            focusedContainerColor = Color.Black.copy(alpha = 0.3f),
                            unfocusedContainerColor = Color.Black.copy(alpha = 0.3f)
                        ),

                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // TOTP Code Input (Styled as monospace spacer)
                    OutlinedTextField(
                        value = totpCode,
                        onValueChange = { if (it.length <= 6) totpCode = it },
                        label = { Text("Authenticator TOTP", color = TextSecondary) },
                        placeholder = { Text("000000", color = Color.Gray) },
                        singleLine = true,
                        textStyle = LocalTextStyle.current.copy(
                            fontFamily = FontFamily.Monospace,
                            fontSize = 18.sp,
                            textAlign = TextAlign.Center,
                            letterSpacing = 8.sp
                        ),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = PrimaryGreen,
                            unfocusedBorderColor = BorderGlass,
                            focusedContainerColor = Color.Black.copy(alpha = 0.3f),
                            unfocusedContainerColor = Color.Black.copy(alpha = 0.3f)
                        ),

                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Submit Button with sleek green-emerald gradient
                    Button(
                        onClick = {
                            if (clientCode.isBlank() || securePin.isBlank() || totpCode.isBlank()) {
                                errorMessage = "Please fill in all credentials."
                                return@Button
                            }
                            
                            isLoading = true
                            errorMessage = null
                            coroutineScope.launch {
                                try {
                                    // Update backend IP before calling if custom
                                    NetworkClient.updateBaseUrl(ipInput)
                                    val response = NetworkClient.apiService.login(
                                        LoginRequest(clientCode, securePin, totpCode)
                                    )
                                    if (response.success) {
                                        onLoginSuccess()
                                    } else {
                                        errorMessage = response.message
                                    }
                                } catch (e: Exception) {
                                    errorMessage = "Connection failed. Please check your Host IP."
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        enabled = !isLoading,
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.Transparent,
                            disabledContainerColor = PrimaryGreen.copy(alpha = 0.5f)
                        ),
                        contentPadding = PaddingValues(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(PrimaryGreen, Color(0xFF10B981))
                                ),
                                shape = RoundedCornerShape(16.dp)
                            )
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                color = Color.Black,
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.5.dp
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("AUTHENTICATING...", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        } else {
                            Text("CONNECT TO ALGO TRADE", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Host Settings Toggle
                    TextButton(onClick = { showIpSettings = !showIpSettings }) {
                        Text(
                            text = if (showIpSettings) "Hide Host Settings" else "Show Host Settings",
                            color = AccentBlue,
                            fontSize = 13.sp
                        )
                    }
                    
                    AnimatedVisibility(visible = showIpSettings) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = ipInput,
                                onValueChange = { ipInput = it },
                                label = { Text("Server IP/Url", color = TextSecondary) },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = TextPrimary,
                                    unfocusedTextColor = TextPrimary,
                                    focusedBorderColor = AccentBlue,
                                    unfocusedBorderColor = BorderGlass
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            // Bottom Section - DEVELOPED BY ADITYA SOORAJ Watermark
            Text(
                text = "DEVELOPED BY ADITYA SOORAJ",
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = MonospaceWatermark,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 4.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
    }
}
