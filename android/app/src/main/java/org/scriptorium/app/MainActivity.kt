package org.scriptorium.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.*
import androidx.lifecycle.viewmodel.compose.viewModel
import org.scriptorium.app.ui.ScriptoriumApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT))
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(
                primary = Color(0xFFD4BD8D), onPrimary = Color(0xFF201C13),
                background = Color(0xFF12161B), surface = Color(0xFF191E24),
                onBackground = Color(0xFFE9E2D6), onSurface = Color(0xFFE9E2D6),
                secondary = Color(0xFFB2C4C9), outline = Color(0xFF68665E),
                primaryContainer = Color(0xFF40372A), onPrimaryContainer = Color(0xFFE9E2D6),
                secondaryContainer = Color(0xFF40372A), onSecondaryContainer = Color(0xFFD4BD8D),
                surfaceContainer = Color(0xFF191E24),
                surfaceContainerHigh = Color(0xFF222A30), onSurfaceVariant = Color(0xFFBEC8CB),
            )) { ScriptoriumApp(viewModel()) }
        }
    }
}
