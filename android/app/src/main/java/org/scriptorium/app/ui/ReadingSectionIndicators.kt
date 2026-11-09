package org.scriptorium.app.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.data.readingIndicatorWindow

/** Narrow reserved gutter; it never overlays the text or creates a second scroll container. */
@Composable
internal fun ReadingSectionIndicators(count: Int, selected: Int, label: (Int) -> String,
                                      modifier: Modifier = Modifier, choose: (Int) -> Unit) {
    val motion = LocalReadingAppearance.current.motion
    BoxWithConstraints(modifier.width(30.dp).fillMaxHeight(), contentAlignment = Alignment.Center) {
        val capacity = (maxHeight.value / 44f).toInt().coerceIn(1, 9)
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.semantics { contentDescription = "Seções de leitura" }) {
            readingIndicatorWindow(count, selected, capacity).forEach { index ->
                val active = index == selected
                val color by animateColorAsState(if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), tween(if (motion) 220 else 0), label = "Seção ativa")
                val length by animateDpAsState(if (active) 16.dp else 5.dp, tween(if (motion) 220 else 0), label = "Indicador de seção")
                Box(Modifier.size(30.dp, 44.dp).clickable(role = Role.Button, onClickLabel = "Ir a ${label(index)}") { choose(index) }
                    .clearAndSetSemantics {
                        contentDescription = "Navegar: ${label(index)}"
                        this.selected = active
                        stateDescription = if (active) "Seção atual" else "Outra seção"
                        role = Role.Button
                        onClick("Ir a ${label(index)}") { choose(index); true }
                    }, contentAlignment = Alignment.Center) {
                    if (active) Text("${index + 1}", fontSize = 9.sp, color = color, modifier = Modifier.align(Alignment.CenterStart))
                    Box(Modifier.align(Alignment.CenterEnd).padding(end = 6.dp).width(3.dp).height(length).background(color, RoundedCornerShape(2.dp)))
                }
            }
        }
    }
}
