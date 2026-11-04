package org.scriptorium.app.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp

/** Rebuild on entry, travel in the direction of study. No persistent/progress mutation. */
@Composable
internal fun Modifier.studyPointMotion(identity: Any, position: Int): Modifier {
    val motion = LocalReadingAppearance.current.motion
    val progress = remember { Animatable(if (motion) 0f else 1f) }
    var previous by remember { mutableIntStateOf(position) }
    var direction by remember { mutableIntStateOf(1) }
    LaunchedEffect(identity, motion) {
        direction = if (position < previous) -1 else 1
        previous = position
        if (!motion) progress.snapTo(1f) else {
            progress.snapTo(0f)
            progress.animateTo(1f, tween(480, easing = FastOutSlowInEasing))
        }
    }
    return graphicsLayer {
        alpha = progress.value
        translationX = (1f - progress.value) * 48.dp.toPx() * direction
        translationY = (1f - progress.value) * 8.dp.toPx()
    }
}
