package org.scriptorium.app.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp

/** Narrow reserved gutter; it never overlays the text or creates a second scroll container. */
@Composable
internal fun ReadingSectionIndicators(count: Int, selected: Int, label: (Int) -> String,
                                      modifier: Modifier = Modifier, choose: (Int) -> Unit) {
    val motion = LocalReadingAppearance.current.motion
    BoxWithConstraints(modifier.width(30.dp).fillMaxHeight(), contentAlignment = Alignment.Center) {
        val available = (maxHeight.value / 44f).toInt().coerceIn(1, 9)
        val radius = (if (available % 2 == 0) available - 1 else available) / 2
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.semantics { contentDescription = "Seções de leitura" }) {
            (-radius..radius).forEach { offset ->
                val index = selected.coerceIn(0, (count - 1).coerceAtLeast(0)) + offset
                if (index !in 0 until count) { Spacer(Modifier.size(30.dp, 44.dp)); return@forEach }
                key(index) {
                val active = index == selected
                val color by animateColorAsState(if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), tween(if (motion) 220 else 0), label = "Seção ativa")
                val length by animateDpAsState(if (active) 24.dp else 11.dp, tween(if (motion) 220 else 0), label = "Indicador de seção")
                Box(Modifier.size(30.dp, 44.dp).clickable(role = Role.Button, onClickLabel = "Ir a ${label(index)}") { choose(index) }
                    .clearAndSetSemantics {
                        contentDescription = "Navegar: ${label(index)}"
                        this.selected = active
                        stateDescription = if (active) "Seção atual" else "Outra seção"
                        role = Role.Button
                        onClick("Ir a ${label(index)}") { choose(index); true }
                    }, contentAlignment = Alignment.Center) {
                    Box(Modifier.align(Alignment.CenterEnd).padding(end = 3.dp).width(length).height(if (active) 3.dp else 2.dp).background(color, RoundedCornerShape(2.dp)))
                }
                }
            }
        }
    }
}
