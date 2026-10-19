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
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.hypot

data class GraphNode(val id: String, val label: String, val x: Float, val y: Float, val color: Color = Color(0xFFBCA16A))
data class GraphEdge(val from: String, val to: String, val label: String = "")

@Composable
fun KnowledgeGraph(nodes: List<GraphNode>, edges: List<GraphEdge>, selected: String? = null, onSelect: (String) -> Unit) {
    var zoom by remember { mutableFloatStateOf(1f) }
    var pan by remember { mutableStateOf(Offset.Zero) }
    val measurer = rememberTextMeasurer()
    val textColor = MaterialTheme.colorScheme.onSurface
    val byId = remember(nodes) { nodes.associateBy { it.id } }
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Arraste para mover · use dois dedos para ampliar", style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
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
            withTransform({ translate(size.width / 2 + pan.x, size.height / 2 + pan.y); scale(fit * zoom, fit * zoom, Offset.Zero); translate(-540f, -380f) }) {
                edges.forEach { edge ->
                    val from = byId[edge.from]; val to = byId[edge.to]
                    if (from != null && to != null) drawLine(Color(0xFF8A7859), Offset(from.x, from.y), Offset(to.x, to.y), 2f)
                }
                nodes.forEach { node ->
                    val center = Offset(node.x, node.y)
                    drawCircle(node.color.copy(alpha = if (selected == node.id) 1f else 0.8f), if (selected == node.id) 28f else 19f, center)
                    val layout = measurer.measure(node.label, TextStyle(color = textColor, fontSize = 15.sp))
                    drawText(layout, topLeft = Offset(node.x - layout.size.width / 2f, node.y + 30f))
                }
            }
        }
        // Accessible alternatives to spatial tapping and labels that may be small before zooming.
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(nodes, key = { it.id }) { node -> FilterChip(selected = selected == node.id, onClick = { onSelect(node.id) }, label = { Text(node.label) }) }
        }
    }
}
