package org.scriptorium.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.hypot

data class GraphNode(val id: String, val label: String, val x: Float, val y: Float, val color: Color = Color(0xFFBCA16A), val learningState: String? = null)
data class GraphEdge(val from: String, val to: String, val label: String = "")

@Composable
fun KnowledgeGraph(nodes: List<GraphNode>, edges: List<GraphEdge>, selected: String? = null, onSelect: (String) -> Unit) {
    var zoom by remember { mutableFloatStateOf(1f) }
    var pan by remember { mutableStateOf(Offset.Zero) }
    val measurer = rememberTextMeasurer()
    val textColor = MaterialTheme.colorScheme.onSurface
    val edgeColor = MaterialTheme.colorScheme.secondary
    val skill = nodes.any { it.learningState != null }
    val gold = if (MaterialTheme.colorScheme.surface.luminance() > 0.5f) Color(0xFF94711D) else Color(0xFFD6B85A)
    val grey = Color(0xFF858E96)
    val nodeSurface = MaterialTheme.colorScheme.surfaceContainerHigh
    var picker by remember { mutableStateOf(false) }
    val byId = remember(nodes) { nodes.associateBy { it.id } }
    // Distance to the closest other point, in map units: how much room each name has.
    val room = remember(nodes) {
        nodes.associate { node -> node.id to (nodes.filter { it !== node }.minOfOrNull { hypot((it.x - node.x).toDouble(), (it.y - node.y).toDouble()) } ?: Double.MAX_VALUE) }
    }
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(if (skill) "Dourado: liberado · cinza: pré-requisito" else "Arraste para mover · use dois dedos para ampliar", style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
            TextButton(onClick = { zoom = 1f; pan = Offset.Zero }) { Text("Centralizar") }
        }
        Canvas(Modifier.fillMaxWidth().height(340.dp)
            .pointerInput(nodes) { detectTransformGestures { _, movement, factor, _ -> pan += movement; zoom = (zoom * factor).coerceIn(0.5f, 5f) } }
            .pointerInput(nodes, zoom, pan) {
                detectTapGestures { point ->
                    val fit = minOf(size.width / 1080f, size.height / 760f)
                    val origin = Offset(size.width / 2f, size.height / 2f) + pan
                    val local = (point - origin) / (fit * zoom) + Offset(540f, 380f)
                    nodes.minByOrNull { hypot((it.x - local.x).toDouble(), (it.y - local.y).toDouble()) }
                        ?.takeIf { hypot((it.x - local.x).toDouble(), (it.y - local.y).toDouble()) < 75 }
                        ?.let { onSelect(it.id) }
                }
            }) {
            val fit = minOf(size.width / 1080f, size.height / 760f)
            // Names that would pile on each other are left out until the reader zooms in; the chosen
            // point and its neighbours keep theirs, and the chips below always list every name.
            val scale = fit * zoom
            val neighbours = edges.filter { it.from == selected || it.to == selected }.flatMap { listOf(it.from, it.to) }.toSet()
            fun named(node: GraphNode) = node.id == selected || (skill && (node.id == "study-origin" || node.id.startsWith("journey:"))) || (!skill && (node.id in neighbours || (room[node.id] ?: 0.0) * scale >= 140))
            withTransform({ translate(size.width / 2 + pan.x, size.height / 2 + pan.y); scale(fit * zoom, fit * zoom, Offset.Zero); translate(-540f, -380f) }) {
                edges.forEach { edge ->
                    val from = byId[edge.from]; val to = byId[edge.to]
                    if (from != null && to != null) {
                        val lit = skill && from.learningState == "Concluído" && to.learningState != "Bloqueado"
                        drawLine(if (skill) (if (lit) gold else grey.copy(alpha = 0.5f)) else Color(0xFF8A7859), Offset(from.x, from.y), Offset(to.x, to.y), if (lit) 3f else 2f)
                        if (edge.label.isNotBlank() && named(from) && named(to)) {
                            val layout = measurer.measure(edge.label, TextStyle(color = edgeColor, fontSize = 13.sp))
                            drawText(layout, topLeft = Offset((from.x + to.x - layout.size.width) / 2f, (from.y + to.y) / 2f - layout.size.height))
                        }
                    }
                }
                nodes.forEach { node ->
                    val center = Offset(node.x, node.y)
                    if (skill) {
                        val accent = if (node.learningState == "Bloqueado") grey else gold
                        val radius = if (node.id == "study-origin") 31f else if (node.id.startsWith("journey:")) 25f else 21f
                        if (node.learningState != "Bloqueado") drawCircle(accent.copy(alpha = 0.09f), radius + 9f, center)
                        drawCircle(nodeSurface, radius, center)
                        drawCircle(accent, radius, center, style = Stroke(if (node.id == selected) 4f else 2.5f))
                        drawCircle(accent.copy(alpha = 0.55f), radius - 5f, center, style = Stroke(1f))
                        if (node.learningState == "Concluído") {
                            drawLine(accent, center + Offset(-8f, 0f), center + Offset(-2f, 6f), 3f)
                            drawLine(accent, center + Offset(-2f, 6f), center + Offset(10f, -7f), 3f)
                        } else {
                            drawLine(accent, center + Offset(-8f, 0f), center + Offset(8f, 0f), 2f)
                            drawLine(accent, center + Offset(0f, -8f), center + Offset(0f, 8f), 2f)
                        }
                    } else drawCircle(node.color.copy(alpha = if (selected == node.id) 1f else 0.8f), if (selected == node.id) 28f else 19f, center)
                    if (named(node)) {
                        // Long names wrap on two centred lines instead of running into the next point's name.
                        val display = node.label
                        val layout = measurer.measure(display, TextStyle(color = textColor, fontSize = if (skill) 12.sp else 15.sp, textAlign = TextAlign.Center), constraints = Constraints(maxWidth = if (skill) 190 else 280))
                        drawText(layout, topLeft = Offset(node.x - layout.size.width / 2f, node.y + 30f))
                    }
                }
            }
        }
        // Accessible alternatives to spatial tapping and labels that may be small before zooming.
        if (skill) Box {
            TextButton(onClick = { picker = true }) { Text(nodes.find { it.id == selected }?.label ?: "Selecionar conceito") }
            DropdownMenu(expanded = picker, onDismissRequest = { picker = false }) {
                nodes.forEach { node -> DropdownMenuItem(text = { Column { Text(node.label); Text(node.learningState.orEmpty(), style = MaterialTheme.typography.labelSmall) } }, onClick = { picker = false; onSelect(node.id) }) }
            }
        } else LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(nodes, key = { it.id }) { node -> FilterChip(selected = selected == node.id, onClick = { onSelect(node.id) }, label = { Text(node.label + (node.learningState?.let { " · $it" } ?: "")) }) }
        }
    }
}
