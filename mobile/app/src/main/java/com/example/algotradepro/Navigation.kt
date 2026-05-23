package com.example.algotradepro

import androidx.compose.runtime.Composable
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.algotradepro.ui.screens.DashboardScreen
import com.example.algotradepro.ui.screens.LoginScreen

@Composable
fun MainNavigation() {
    val backStack = rememberNavBackStack(Login)

    NavDisplay(
        backStack = backStack,
        onBack = { 
            if (backStack.size > 1) {
                backStack.removeLastOrNull() 
            }
        },
        entryProvider = entryProvider {
            entry<Login> {
                LoginScreen(
                    onLoginSuccess = {
                        backStack.add(Dashboard)
                    }
                )
            }
            entry<Dashboard> {
                DashboardScreen(
                    onLogout = {
                        backStack.removeLastOrNull()
                    }
                )
            }
        }
    )
}
