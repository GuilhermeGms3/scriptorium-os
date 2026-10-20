package org.scriptorium.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle
import androidx.compose.runtime.*
import androidx.compose.material3.*
import androidx.lifecycle.viewmodel.compose.viewModel
import org.scriptorium.app.ui.ScriptoriumApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT))
        setContent {
            val preferences = remember { org.scriptorium.app.data.ReadingPreferences(this@MainActivity) }
            var appearance by remember { mutableStateOf(preferences.appearance) }
            DisposableEffect(preferences) {
                val unsubscribe = preferences.observeAppearance { appearance = preferences.appearance }
                onDispose(unsubscribe)
            }
            DisposableEffect(appearance.theme) {
                val light = appearance.theme == org.scriptorium.app.data.ReadingTheme.LIGHT
                val bars = if (light) SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
                    else SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                enableEdgeToEdge(statusBarStyle = bars, navigationBarStyle = bars)
                onDispose { }
            }
            CompositionLocalProvider(org.scriptorium.app.ui.LocalReadingAppearance provides appearance) {
                MaterialTheme(colorScheme = org.scriptorium.app.ui.readingColors(appearance.theme)) { ScriptoriumApp(viewModel()) }
            }
        }
    }
}
