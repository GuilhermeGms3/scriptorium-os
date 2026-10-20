package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp

@Composable
fun NoteColorPicker(value: String, enabled: Boolean = true, change: (String) -> Unit) {
    val palette = listOf("Bronze" to "#bca16a", "Pergaminho" to "#e4cfaa", "Terracota" to "#c58169", "Vinho" to "#b36f83", "Oliva" to "#8fa879", "Petróleo" to "#69a6a2", "Azul" to "#7c9dc8", "Lavanda" to "#a492c9")
    Column {
        Text("Cor da nota · ${palette.find { it.second.equals(value, true) }?.first ?: "Personalizada"}", style = MaterialTheme.typography.labelSmall)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), contentPadding = PaddingValues(vertical = 4.dp)) {
            items(palette) { (name, hex) ->
                val chosen = value.equals(hex, true)
                Surface(onClick = { change(hex) }, enabled = enabled, shape = CircleShape,
                    color = Color(android.graphics.Color.parseColor(hex)),
                    modifier = Modifier.size(48.dp).semantics { contentDescription = "Cor $name"; selected = chosen; role = Role.RadioButton }) {
                    Box(contentAlignment = androidx.compose.ui.Alignment.Center) { if (chosen) Text("✓", color = Color(0xFF15191E)) }
                }
            }
        }
    }
}
