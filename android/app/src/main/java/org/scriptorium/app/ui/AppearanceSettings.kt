package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.toggleable
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.data.*

@Composable
fun AppearanceSettings() {
    val preferences = rememberReadingPreferences()
    val appearance = LocalReadingAppearance.current
    fun update(value: ReadingAppearance) { preferences.appearance = value }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp), contentPadding = PaddingValues(bottom = 28.dp)) {
        item { Heading("Aparência e leitura", "Ajustes deste aparelho. A prévia acompanha suas escolhas.") }
        item { Text("Fonte de leitura", style = MaterialTheme.typography.titleMedium)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { items(ReadingFont.entries) { font -> FilterChip(appearance.font == font, { update(appearance.copy(font = font)) }, label = { Text(font.label) }) } }
        }
        item { Text("Tamanho da leitura · ${appearance.size}", style = MaterialTheme.typography.titleMedium)
            Slider(appearance.size.toFloat(), { update(appearance.copy(size = it.toInt())) }, valueRange = 18f..32f, steps = 13)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                OutlinedButton(enabled = appearance.size > 18, onClick = { update(appearance.copy(size = appearance.size - 1)) }) { Text("Diminuir letra") }
                OutlinedButton(enabled = appearance.size < 32, onClick = { update(appearance.copy(size = appearance.size + 1)) }) { Text("Aumentar letra") }
            }
        }
        item { Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.small) {
            Column(Modifier.padding(18.dp)) {
                Text("PRÉVIA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                Text("Texto de leitura: observe a fonte, o tamanho e o espaço entre as linhas.", Modifier.padding(top = 10.dp), fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.55f).sp)
                Text("Os comentários usam uma escala menor e uma superfície própria.", Modifier.padding(top = 14.dp), fontSize = (appearance.size * 0.77f).coerceAtLeast(14f).sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } }
        item { Text("Cores do Scriptorium", style = MaterialTheme.typography.titleMedium)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { items(ReadingTheme.entries) { theme -> FilterChip(appearance.theme == theme, { update(appearance.copy(theme = theme)) }, label = { Text(theme.label) }) } }
        }
        item { HorizontalDivider(); Row(Modifier.fillMaxWidth().toggleable(appearance.dockedComments, role = Role.Switch) { update(appearance.copy(dockedComments = it)) }, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text("Comentários no painel inferior", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
            Switch(appearance.dockedComments, null)
        }; Text("Separados dos versículos, com filtros e indicação do trecho. Desligue para ler os comentários abaixo de cada versículo.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary) }
        item { Row(Modifier.fillMaxWidth().toggleable(appearance.motion, role = Role.Switch) { update(appearance.copy(motion = it)) }, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text("Construção animada das páginas", Modifier.weight(1f)); Switch(appearance.motion, null)
        } }
    }
}

@Composable
private fun rememberReadingPreferences(): ReadingPreferences { val context = LocalContext.current; return remember(context) { ReadingPreferences(context) } }
