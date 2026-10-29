package org.scriptorium.app.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontFamily
import org.scriptorium.app.data.*

val LocalReadingAppearance = staticCompositionLocalOf { ReadingAppearance() }
val ReadingAppearance.fontFamily: FontFamily get() = when (font) { ReadingFont.SERIF -> FontFamily.Serif; ReadingFont.SANS -> FontFamily.SansSerif; ReadingFont.MONO -> FontFamily.Monospace }

fun readingColors(theme: ReadingTheme): ColorScheme {
    if (theme == ReadingTheme.BROWN) return darkColorScheme(primary = Color(0xFFE2C79C), onPrimary = Color(0xFF302317), background = Color(0xFF302822), surface = Color(0xFF3A3028), surfaceContainer = Color(0xFF40352C), surfaceContainerHigh = Color(0xFF493D32), onSurface = Color(0xFFF0E5D6), onBackground = Color(0xFFF0E5D6), onSurfaceVariant = Color(0xFFD0BEA9), secondary = Color(0xFFD6BA95), outline = Color(0xFF9B8770), primaryContainer = Color(0xFF5B4935), onPrimaryContainer = Color(0xFFF9E4C4), secondaryContainer = Color(0xFF504131), onSecondaryContainer = Color(0xFFF0DEC7))
    if (theme == ReadingTheme.GRAY) return darkColorScheme(primary = Color(0xFFF0F0F0), onPrimary = Color(0xFF252525), background = Color(0xFF414141), surface = Color(0xFF494949), surfaceContainer = Color(0xFF505050), surfaceContainerHigh = Color(0xFF5A5A5A), onSurface = Color.White, onBackground = Color.White, onSurfaceVariant = Color(0xFFE0E0E0), secondary = Color(0xFFE2E2E2), outline = Color(0xFFA5A5A5), primaryContainer = Color(0xFF626262), onPrimaryContainer = Color.White, secondaryContainer = Color(0xFF606060), onSecondaryContainer = Color.White)
    if (theme == ReadingTheme.LIGHT) return lightColorScheme(primary = Color(0xFF665132), onPrimary = Color.White,
        background = Color(0xFFF6F3EC), surface = Color(0xFFFFFCF6), onSurface = Color(0xFF252C32), onBackground = Color(0xFF252C32),
        secondary = Color(0xFF3D626A), surfaceContainerHigh = Color(0xFFECEDE9), surfaceContainer = Color(0xFFF1EFE9),
        primaryContainer = Color(0xFFEAE2D2), onPrimaryContainer = Color(0xFF30291F), secondaryContainer = Color(0xFFDCE9EA), onSurfaceVariant = Color(0xFF505D63))
    val (background, surface, high) = when (theme) {
        ReadingTheme.GRAY -> Triple(0xFF25282C, 0xFF2C3035, 0xFF343B42)
        ReadingTheme.BROWN -> Triple(0xFF302822, 0xFF3A3028, 0xFF493D32)
        else -> Triple(0xFF12161B, 0xFF191E24, 0xFF222B34)
    }
    return darkColorScheme(primary = Color(0xFFD4BD8D), onPrimary = Color(0xFF201C13),
        background = Color(background), surface = Color(surface), surfaceContainer = Color(surface), surfaceContainerHigh = Color(high),
        onSurface = Color(0xFFE9E4DA), onBackground = Color(0xFFE9E4DA), onSurfaceVariant = Color(0xFFBFCAD2),
        secondary = Color(0xFF9DC6CE), outline = Color(0xFF727982), primaryContainer = Color(0xFF303B43), onPrimaryContainer = Color(0xFFE4EBEF),
        secondaryContainer = Color(0xFF293C42), onSecondaryContainer = Color(0xFFC5E3E8))
}

@Composable
fun sourceAccent(row: Row): Color {
    if (LocalReadingAppearance.current.theme == ReadingTheme.GRAY) return MaterialTheme.colorScheme.primary
    val dark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val index = Math.floorMod(row.text("document_id").ifBlank { row.text("source_title") }.hashCode(), 4)
    return if (dark) listOf(Color(0xFF9CBEE5), Color(0xFF91CDBD), Color(0xFFC2AEE2), Color(0xFFE0B9A1))[index]
    else listOf(Color(0xFF305A86), Color(0xFF276853), Color(0xFF6B498D), Color(0xFF845234))[index]
}

/** Short, staggered construction of visible sections. Compose respects system animation scale. */
@Composable
fun Modifier.revealSection(order: Int = 0): Modifier {
    val motion = LocalReadingAppearance.current.motion
    var ready by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { ready = true }
    val progress by animateFloatAsState(if (ready || !motion) 1f else 0f,
        tween(if (motion) 420 else 0, delayMillis = if (motion) order.coerceIn(0, 5) * 65 else 0), label = "Construir seção")
    return graphicsLayer { alpha = progress; translationY = (1f - progress) * 22f; scaleX = 0.99f + progress * 0.01f; scaleY = scaleX }
}
