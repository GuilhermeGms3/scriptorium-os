package org.scriptorium.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextOverflow

/** Connected stations in the Scriptorium palette; academic progress comes from the caller. */
@Composable
fun StudyRail(titles: List<String>, selected: Int, label: String, enabled: (Int) -> Boolean = { true }, completed: (Int) -> Boolean = { false }, compact: Boolean = false, choose: (Int) -> Unit) {
    val list = rememberLazyListState()
    val motion = LocalReadingAppearance.current.motion
    LaunchedEffect(selected) {
        if (titles.isNotEmpty()) {
            val index = (selected - 1).coerceAtLeast(0)
            if (motion) list.animateScrollToItem(index) else list.scrollToItem(index)
        }
    }
    Column(Modifier.revealSection(1)) {
        Text("$label · ${selected + 1} de ${titles.size}", Modifier.padding(horizontal = 4.dp, vertical = 6.dp), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
        LazyRow(state = list, contentPadding = PaddingValues(vertical = 4.dp)) {
            itemsIndexed(titles) { index, title ->
                val available = enabled(index)
                val done = completed(index)
                val current = selected == index
                val accent = when { done -> MaterialTheme.colorScheme.secondary; current -> MaterialTheme.colorScheme.primary; available -> MaterialTheme.colorScheme.onSurfaceVariant; else -> MaterialTheme.colorScheme.outline }
                val surface = MaterialTheme.colorScheme.surfaceContainerHigh
                val level = if (compact) 30.dp else if (index % 2 == 0) 46.dp else 74.dp
                Box(Modifier.width(if (compact) 140.dp else 164.dp).height(if (compact) 112.dp else 174.dp)
                    .clickable(enabled = available, role = Role.Button, onClickLabel = "Abrir $title") { choose(index) }
                    .semantics { this.selected = current; stateDescription = when { done -> "Concluído"; !available -> "Bloqueado: conclua o ponto anterior"; current -> "Ponto atual"; else -> "Disponível" } }) {
                    Canvas(Modifier.fillMaxWidth().height(if (compact) 66.dp else 116.dp)) {
                        val x = size.width / 2
                        val y = level.toPx()
                        val middle = if (compact) y else 60.dp.toPx()
                        val radius = if (compact) 21.dp.toPx() else 25.dp.toPx()
                        val path = Path().apply {
                            if (index > 0) { moveTo(0f, middle); cubicTo(x * 0.5f, middle, x * 0.5f, y, x - radius, y) }
                            if (index < titles.lastIndex) { moveTo(x + radius, y); cubicTo(x * 1.5f, y, x * 1.5f, middle, size.width, middle) }
                        }
                        drawPath(path, accent.copy(alpha = if (available) 0.6f else 0.25f), style = Stroke(1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 4.dp.toPx()))))
                        if (!compact) {
                            repeat(6) { star ->
                                drawCircle(accent.copy(alpha = 0.16f), radius = 1.dp.toPx(), center = Offset(((index * 19 + star * 37) % 150 + 7).dp.toPx(), ((star * 17 + index * 7) % 100 + 6).dp.toPx()))
                            }
                            drawOval(surface, topLeft = Offset(x - 43.dp.toPx(), y + 13.dp.toPx()), size = Size(86.dp.toPx(), 30.dp.toPx()))
                            drawOval(accent.copy(alpha = 0.45f), topLeft = Offset(x - 43.dp.toPx(), y + 13.dp.toPx()), size = Size(86.dp.toPx(), 23.dp.toPx()), style = Stroke(2.dp.toPx()))
                            drawLine(accent.copy(alpha = 0.35f), Offset(x - 23.dp.toPx(), y + 41.dp.toPx()), Offset(x + 23.dp.toPx(), y + 41.dp.toPx()), 2.dp.toPx())
                        }
                        if (current) drawCircle(accent.copy(alpha = 0.12f), radius + 7.dp.toPx(), Offset(x, y))
                        drawCircle(surface, radius, Offset(x, y))
                        drawCircle(accent.copy(alpha = if (available) 1f else 0.5f), radius, Offset(x, y), style = Stroke(if (current) 2.5.dp.toPx() else 1.5.dp.toPx()))
                    }
                    Box(Modifier.align(Alignment.TopCenter).offset(y = level - 21.dp).size(42.dp), contentAlignment = Alignment.Center) {
                        Text(if (done) "✓" else if (!available) "🔒" else (index + 1).toString().padStart(2, '0'), color = accent, style = MaterialTheme.typography.titleMedium)
                    }
                    Text(title, Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(if (compact) 40.dp else 48.dp).padding(horizontal = 8.dp),
                        style = MaterialTheme.typography.labelMedium, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        color = accent, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}
