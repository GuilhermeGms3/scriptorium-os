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
    var explore by rememberSaveable { mutableStateOf(false) }
    var lessonsOpen by rememberSaveable { mutableStateOf(false) }
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    val nodes = state.map?.objects("nodes").orEmpty()
    val discovery = state.discovery
    val modules = discovery?.objects("modules").orEmpty()
    val current = StudySequence.resumeIndex(modules, state.progress)
    val count = modules.count { module -> state.progress.any { it.text("module_id") == module.getString("id") && !it["completed_at"].isNullOrBlank() } }
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Heading("Conhecer para amar", "Uma pergunta abre o caminho. Seu estudo revela o próximo passo.") }
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
            Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = MaterialTheme.shapes.medium) {
                Column(Modifier.padding(16.dp)) {
                    Text("Este conceito será liberado", style = MaterialTheme.typography.titleSmall)
                    Text("Conclua: ${prerequisites.joinToString(" e ")}. Os pontos anteriores continuam disponíveis para revisão.", style = MaterialTheme.typography.bodyMedium)
                }
            }
        } }
        if (discovery != null && modules.isNotEmpty()) item {
            Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.medium) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(if (count == modules.size) "PERCURSO CONCLUÍDO" else "SUA PRÓXIMA DESCOBERTA · ${current + 1} DE ${modules.size}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                    Text(modules[current].getString("title"), style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Serif)
                    Text(modules[current].getString("description"), style = MaterialTheme.typography.bodyMedium)
                    LinearProgressIndicator(progress = { count.toFloat() / modules.size }, modifier = Modifier.fillMaxWidth())
                    Text("$count de ${modules.size} pontos concluídos · progresso neste aparelho", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { chooseCourse(discovery.getString("id"), -1) }) { Text(if (count == modules.size) "Revisar percurso" else if (state.progress.isEmpty()) "Começar minha descoberta" else "Continuar minha descoberta") }
                }
            }
            StudyRail(modules.map { it.getString("title") }, current, "Conhecer para amar", enabled = { StudySequence.unlocked(modules, it, state.progress) }, completed = { index -> state.progress.any { it.text("module_id") == modules[index].getString("id") && !it["completed_at"].isNullOrBlank() } }, compact = true) { index -> chooseCourse(discovery.getString("id"), index) }
        }
        item { OutlinedButton(onClick = { explore = !explore }, modifier = Modifier.fillMaxWidth()) { Text(if (explore) "Recolher outros estudos" else "Explorar outros estudos") } }
        if (explore) {
            item { Text("Percursos independentes e aulas de consulta. A progressão dos conceitos permanece na árvore.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(state.courses.filter { it.text("id") != discovery?.getString("id") }, key = { it.text("id") }) { row ->
                OutlinedCard(onClick = { chooseCourse(row.text("id"), -1) }, modifier = Modifier.fillMaxWidth()) { Text(row.text("title"), Modifier.padding(18.dp), style = MaterialTheme.typography.titleMedium) }
            }
            item { TextButton(onClick = { lessonsOpen = !lessonsOpen }) { Text("Aulas temáticas · ${state.lessons.size} ${if (lessonsOpen) "▴" else "▾"}") } }
            if (lessonsOpen) item { ThematicLessons(state.lessons, repository, chooseLesson) }
        }
    }
}
