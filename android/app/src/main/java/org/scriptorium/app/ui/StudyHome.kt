package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import org.json.JSONObject
import org.scriptorium.app.data.*

internal data class StudyHomeState(val map: JSONObject?, val courses: List<Row>, val lessons: List<Row>,
    val discovery: JSONObject?, val progress: List<Row>, val tree: StudyTreeProgress) {
    fun guideUnlocked(id: String): Boolean = map?.objects("nodes")?.filter { it.optString("guideId") == id }
        ?.any { tree.unlocked(it.getString("id")) } == true
}

internal fun loadStudyHome(repository: MobileRepository, personal: PersonalRepository): StudyHomeState {
    val map = repository.catalogItem("study-map")
    val nodes = map?.objects("nodes").orEmpty()
    val discovery = repository.navigation.discovery()
    val progress = discovery?.let { personal.progress(it.getString("id"), it.getInt("revision")) }.orEmpty()
    val complete = nodes.filter { node ->
        val id = node.getString("guideId")
        val guide = repository.catalogItem("guide:$id") ?: return@filter false
        val pages = StudySequence.guide(guide, repository.catalogItem("lesson:study-guide:$id"))
        val marks = personal.progress("guide:$id", 1).filter { !it["completed_at"].isNullOrBlank() }.map { it.text("module_id") }.toSet()
        pages.isNotEmpty() && pages.all { it.id in marks }
    }.map { it.getString("id") }.toMutableSet()
    if (discovery != null && discovery.objects("modules").isNotEmpty() && discovery.objects("modules").all { module -> progress.any { it.text("module_id") == module.getString("id") && !it["completed_at"].isNullOrBlank() } }) complete += "study-origin"
    val parents = map?.objects("edges").orEmpty().groupBy({ it.getString("to") }, { it.getString("from") })
    return StudyHomeState(map, repository.catalog("course"), repository.catalog("lesson"), discovery, progress, StudyTreeProgress(parents, complete))
}

@Composable
internal fun StudyHome(state: StudyHomeState, repository: MobileRepository, chooseGuide: (String) -> Unit, chooseCourse: (String, Int) -> Unit, chooseLesson: (String) -> Unit) {
    var area by rememberSaveable { mutableStateOf("Árvore") }
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    val nodes = state.map?.objects("nodes").orEmpty()
    val discovery = state.discovery
    val modules = discovery?.objects("modules").orEmpty()
    val current = StudySequence.resumeIndex(modules, state.progress)
    val count = modules.count { module -> state.progress.any { it.text("module_id") == module.getString("id") && !it["completed_at"].isNullOrBlank() } }
    Column(Modifier.fillMaxSize()) {
        Heading("Estudos")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Árvore", "Percursos", "Temas").forEach { label ->
                FilterChip(area == label, { area = label }, label = { Text(label) })
            }
        }
        LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (area == "Árvore") {
                if (nodes.isNotEmpty()) item {
                    KnowledgeGraph(nodes.map { node ->
                        val id = node.getString("id")
                        GraphNode(id, node.getString("shortTitle"), node.getDouble("x").toFloat(), node.getDouble("y").toFloat(),
                            learningState = when { state.tree.done(id) -> "Concluído"; state.tree.unlocked(id) -> "Disponível"; else -> "Bloqueado" })
                    }, state.map!!.objects("edges").map { GraphEdge(it.getString("from"), it.getString("to")) }, selected) { id ->
                        selected = id
                        if (id == "study-origin" && discovery != null) chooseCourse(discovery.getString("id"), -1)
                        else if (state.tree.unlocked(id)) nodes.find { it.getString("id") == id }?.let { chooseGuide(it.getString("guideId")) }
                    }
                }
                selected?.takeUnless(state.tree::unlocked)?.let { id -> item {
                    val prerequisites = state.tree.missing(id).map { parent -> nodes.find { it.getString("id") == parent }?.getString("shortTitle") ?: "ponto anterior" }
                    Text("Pré-requisito: ${prerequisites.joinToString(" e ")}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)
                } }
                if (discovery != null && modules.isNotEmpty()) item {
                    Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.medium) {
                        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            StudyGrowth()
                            Text(discovery.getString("title"), style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Serif)
                            Text("Teologia fundamental · ${modules.size} módulos", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
                            Text(modules[current].getString("title"), style = MaterialTheme.typography.titleMedium)
                            LinearProgressIndicator(progress = { count.toFloat() / modules.size }, modifier = Modifier.fillMaxWidth())
                            Text("$count de ${modules.size} módulos concluídos", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Button(onClick = { chooseCourse(discovery.getString("id"), -1) }) { Text(if (count == modules.size) "Revisar percurso" else if (state.progress.isEmpty()) "Iniciar percurso" else "Retomar percurso") }
                        }
                    }
                }
            } else if (area == "Percursos") {
                items(state.courses.sortedBy { if (it.text("id") == "course:queda-graca-providencia") 0 else 1 }, key = { it.text("id") }) { row ->
                    OutlinedCard(onClick = { chooseCourse(row.text("id"), -1) }, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(row.text("title"), style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
                            Text(if (row.text("id") == "course:queda-graca-providencia") "Antropologia cristã, cinco vias e tradições · 14 módulos" else "Conteúdo, leituras e atividade de síntese", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                        }
                    }
                }
            } else item { ThematicLessons(state.lessons, repository, chooseLesson) }
        }
    }
}
