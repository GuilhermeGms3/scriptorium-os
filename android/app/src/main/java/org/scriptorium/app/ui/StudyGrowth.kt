package org.scriptorium.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp

/** A single native drawing on viewport entry; no perpetual animation or WebView. */
@Composable
internal fun StudyGrowth() {
    val motion = LocalReadingAppearance.current.motion
    val gold = if (MaterialTheme.colorScheme.surface.luminance() > 0.5f) Color(0xFF94711D) else Color(0xFFD6B85A)
    val progress = remember { Animatable(if (motion) 0f else 1f) }
    var visible by remember { mutableStateOf(false) }
    val height = with(LocalDensity.current) { LocalConfiguration.current.screenHeightDp.dp.toPx() }
    LaunchedEffect(visible, motion) {
        if (!motion) progress.snapTo(1f)
        else if (visible) progress.animateTo(1f, tween(950))
    }
    Canvas(Modifier.fillMaxWidth().height(72.dp).onGloballyPositioned { coordinates ->
        val bounds = coordinates.boundsInWindow()
        if (bounds.top < height && bounds.bottom > 0) visible = true
    }) {
        val origin = Offset(12.dp.toPx(), size.height / 2)
        repeat(7) { index ->
            val end = Offset(size.width * (0.48f + (index % 3) * 0.21f), size.height * (0.12f + index * 0.125f))
            val path = Path().apply { moveTo(origin.x, origin.y); cubicTo(size.width * 0.3f, origin.y, size.width * 0.32f, end.y, end.x, end.y) }
            val measure = PathMeasure().apply { setPath(path, false) }
            val segment = Path()
            measure.getSegment(0f, measure.length * progress.value, segment, true)
            drawPath(segment, gold.copy(alpha = 0.55f), style = Stroke(1.2.dp.toPx()))
            if (progress.value > 0.9f) drawCircle(gold.copy(alpha = (progress.value - 0.9f) * 10), 3.dp.toPx(), end)
        }
        drawCircle(gold, 6.dp.toPx(), origin, style = Stroke(1.4.dp.toPx()))
    }
}
