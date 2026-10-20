package org.scriptorium.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*

private val familyLabels = linkedMapOf("reading" to "Leitura e método", "theology" to "Fundamentos", "christology" to "Cristologia",
    "humanity" to "Condição humana", "salvation" to "Salvação", "church" to "Igreja", "spirit" to "Espírito", "hope" to "Esperança", "history" to "História e tradições", "guides" to "Guias integrados")

@Composable
internal fun ThematicLessons(lessons: List<Row>, repository: MobileRepository, choose: (String) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var family by rememberSaveable { mutableStateOf<String?>(null) }
    val present = lessons.mapNotNull { repository.navigation.lesson(it.text("id"))?.optString("family") }.toSet()
    val filtered = lessons.filter { it.text("title").contains(query, true) && (family == null || repository.navigation.lesson(it.text("id"))?.optString("family") == family) }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Escolha uma aula na trilha. Dentro dela: início, desenvolvimento, leituras do acervo e sua síntese.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
        OutlinedTextField(query, { query = it.take(200) }, label = { Text("Encontrar aula") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { FilterChip(family == null, { family = null }, label = { Text("Todas") }) }
            items(familyLabels.filterKeys { it in present }.entries.toList(), key = { it.key }) { entry -> FilterChip(family == entry.key, { family = entry.key }, label = { Text(entry.value) }) }
        }
        if (filtered.isEmpty()) Text("Nenhuma aula corresponde à pesquisa.")
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(vertical = 8.dp)) {
            itemsIndexed(filtered, key = { _, row -> row.text("id") }) { index, row ->
                val metadata = repository.navigation.lesson(row.text("id"))
                Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.4f)), shape = MaterialTheme.shapes.small,
                    modifier = Modifier.width(276.dp).heightIn(min = 188.dp).revealSection(index).clickable { choose(row.text("id")) }) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("AULA ${(index + 1).toString().padStart(2, '0')} · ${familyLabels[metadata?.optString("family")] ?: "Estudo temático"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text(row.text("title"), style = MaterialTheme.typography.titleLarge)
                        Text("${metadata?.optInt("chapters") ?: 0} etapas de conteúdo", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Início → desenvolvimento → síntese", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text("Abrir aula →", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

@Composable
internal fun StudyReadings(id: String, title: String, repository: MobileRepository, open: (StudyReading?) -> Unit, openAll: (() -> Unit)? = null) {
    var more by remember(id) { mutableStateOf(false) }
    Load(id to title, { repository.lessonReadings(id, title) }) { readings ->
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Leituras na Biblioteca", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
            if (readings.isEmpty()) Text("Nenhum trecho ou obra vinculada foi encontrado para esta aula no pacote instalado. Você pode consultar sua Biblioteca.", style = MaterialTheme.typography.bodySmall)
            val previewCount = if (openAll != null) 1 else 4
            (if (more) readings else readings.take(previewCount)).forEachIndexed { index, reading ->
                Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.small, modifier = Modifier.fillMaxWidth().revealSection(index).clickable { open(reading) }) {
                    Column(Modifier.padding(16.dp)) {
                        Text(reading.title, style = MaterialTheme.typography.titleSmall)
                        Text(reading.reason, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        reading.page?.text("excerpt")?.let { Text(it, Modifier.padding(top = 8.dp), maxLines = 3, style = MaterialTheme.typography.bodySmall) }
                        Text("Ler na Biblioteca ↗", Modifier.padding(top = 8.dp), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
            if (readings.size > previewCount) TextButton(onClick = { if (openAll != null) openAll() else more = !more }) { Text(if (openAll != null) "Ver todas as ${readings.size} leituras" else if (more) "Recolher leituras" else "Mais ${readings.size - previewCount} leituras") }
            if (readings.isNotEmpty() && openAll == null) Text("As leituras vinculadas usam o catálogo editorial. Trechos encontrados usam o índice dos seus livros. Apoio à área indica uma leitura mais ampla da trilha, sem associação específica presumida.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (readings.isEmpty()) TextButton(onClick = { open(null) }) { Text("Abrir Biblioteca") }
        }
    }
}
