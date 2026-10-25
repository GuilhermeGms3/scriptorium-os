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
    val topics = lessons.filter { repository.navigation.lesson(it.text("id"))?.optString("family") != "guides" }
    fun group(row: Row): String = when {
        row.text("id").startsWith("lesson:tradition:") -> "traditions"
        row.text("id").startsWith("lesson:entity:council:") -> "councils"
        else -> repository.navigation.lesson(row.text("id"))?.optString("family") ?: "history"
    }
    val labels = familyLabels + mapOf("traditions" to "Tradições cristãs", "councils" to "Concílios")
    val groups = topics.groupBy(::group)
    val filtered = topics.filter { it.text("title").contains(query, true) && (family == null || group(it) == family) }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(query, { query = it.take(200) }, label = { Text("Buscar tema") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        if (family == null && query.isBlank()) {
            Text("Áreas de estudo", style = MaterialTheme.typography.titleLarge)
            groups.entries.toList().chunked(2).forEach { pair ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEach { (key, entries) ->
                        OutlinedCard(onClick = { family = key }, modifier = Modifier.weight(1f).heightIn(min = 96.dp)) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(labels[key] ?: "Estudos", style = MaterialTheme.typography.titleMedium)
                                Text("${entries.size} temas", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            }
                        }
                    }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        } else {
            TextButton(onClick = { family = null; query = "" }) { Text("Voltar às áreas") }
            Text(family?.let { labels[it] } ?: "Resultados", style = MaterialTheme.typography.titleLarge)
            if (filtered.isEmpty()) Text("Nenhum tema corresponde à pesquisa.")
            filtered.forEach { row ->
                OutlinedCard(onClick = { choose(row.text("id")) }, modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(row.text("title"), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                        Text("→", color = MaterialTheme.colorScheme.secondary)
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
