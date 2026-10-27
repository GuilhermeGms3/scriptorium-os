package org.scriptorium.app.ui

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import org.scriptorium.app.data.*

@Composable
internal fun CourseScreen(course: JSONObject, repository: MobileRepository, personal: PersonalRepository, open: (Passage) -> Unit, openLibrary: (StudyReading?) -> Unit = {}, initialModule: Int = -1, close: () -> Unit) {
    val modules = course.objects("modules")
    if (modules.isEmpty()) { Text("Este percurso não tem módulos disponíveis."); TextButton(onClick = close) { Text("Voltar aos percursos") }; return }
    var selected by rememberSaveable(course.getString("id"), initialModule) { mutableIntStateOf(initialModule) }
    var stage by rememberSaveable(selected) { mutableIntStateOf(0) }
    var message by remember { mutableStateOf<String?>(null) }
    var showMap by rememberSaveable(course.getString("id")) { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var noteSource by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Load(course.getString("id"), { personal.progress(course.getString("id"), course.getInt("revision")) }) { loadedProgress ->
        var progress by remember(course.getString("id")) { mutableStateOf(loadedProgress) }
        val moduleIndex = if (selected in modules.indices && StudySequence.unlocked(modules, selected, progress)) selected else StudySequence.resumeIndex(modules, progress)
        val current = modules[moduleIndex]
        val moduleId = current.getString("id")
        val pages = remember(current) { StudySequence.module(current) }
        val pageIndex = stage.coerceIn(pages.indices)
        val page = pages[pageIndex]
        val list = rememberLazyListState()
        LaunchedEffect(page.id, moduleId) { list.scrollToItem(0) }
        var work by rememberSaveable(moduleId, stateSaver = Saver<JSONObject, String>(save = { it.toString() }, restore = { JSONObject(it) })) {
            mutableStateOf(progress.find { it.text("module_id") == moduleId }?.get("work_json")?.let(::JSONObject)
                ?: JSONObject().put("lessons", JSONArray()).put("readings", JSONArray()).put("response", "").put("criteria", JSONArray()))
        }
        fun save(complete: Boolean = false, then: () -> Unit = {}) {
            if (saving) return
            val issues = CoursePolicy.issues(current, work)
            if (complete && issues.isNotEmpty()) { message = issues.joinToString("\n"); return }
            val wasCompleted = progress.any { it.text("module_id") == moduleId && !it["completed_at"].isNullOrBlank() }
            val snapshot = work.toString()
            saving = true
            scope.launch {
                try {
                    progress = withContext(Dispatchers.IO) {
                        personal.saveProgress(course.getString("id"), course.getInt("revision"), moduleId, snapshot, complete || wasCompleted)
                        personal.progress(course.getString("id"), course.getInt("revision"))
                    }
                    if (complete) { stage = 0; selected = (moduleIndex + 1).coerceAtMost(modules.lastIndex); showMap = true }
                    message = if (complete && moduleIndex == modules.lastIndex) "Percurso concluído. Os pontos continuam disponíveis para revisão."
                    else if (complete) "Avanço salvo. Este ponto foi liberado." else null
                    then()
                } catch (failure: Exception) { message = "Não foi possível salvar. ${failure.message.orEmpty()}" }
                finally { saving = false }
            }
        }
        fun choosePage(index: Int) { if (index != pageIndex && index in pages.indices) save { stage = index } }
        fun toggle(key: String, value: String) {
            val values = work.strings(key).toMutableList()
            if (value in values) values.remove(value) else values.add(value)
            work = JSONObject(work.toString()).put(key, JSONArray(values))
        }
        BackHandler { if (!saving) save { if (showMap) close() else if (pageIndex > 0) stage = pageIndex - 1 else showMap = true } }
        Column(Modifier.fillMaxSize()) {
            if (showMap) {
                TextButton(enabled = !saving, onClick = { save(then = close) }) { Text("Voltar aos estudos") }
                Text(course.getString("title"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
            }
            if (showMap) LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { Text("Conclua um ponto para liberar o seguinte. Os anteriores ficam disponíveis para revisão.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                item {
                StudyRail(modules.map { it.getString("title") }, moduleIndex, "Módulos",
                    enabled = { !saving && StudySequence.unlocked(modules, it, progress) },
                    completed = { index -> progress.any { it.text("module_id") == modules[index].getString("id") && !it["completed_at"].isNullOrBlank() } }) { index ->
                    if (index != moduleIndex) save { selected = index; stage = 0 }
                }
                }
                item {
                    Surface(modifier = Modifier.studyPointMotion(moduleId, moduleIndex), color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.medium) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("PONTO ${moduleIndex + 1} · ${current.optString("phase", "Percurso acadêmico")}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                            Text(current.getString("title"), style = MaterialTheme.typography.headlineSmall, fontFamily = androidx.compose.ui.text.font.FontFamily.Serif)
                            Text(current.getString("description"), style = MaterialTheme.typography.bodyMedium)
                            Text("${current.objects("lessons").size} ${if (current.objects("lessons").size == 1) "aula" else "aulas"} · ${current.objects("passages").size} leituras bíblicas · atividade de síntese", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
                            message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary) }
                            Button(enabled = !saving, onClick = { showMap = false }) { Text("Estudar este ponto") }
                            Text("${progress.count { !it["completed_at"].isNullOrBlank() }} de ${modules.size} pontos concluídos", style = MaterialTheme.typography.labelMedium)
                            if (moduleIndex < modules.lastIndex && StudySequence.unlocked(modules, moduleIndex + 1, progress)) TextButton(onClick = { save { selected = moduleIndex + 1; stage = 0 } }) { Text("Avançar para o próximo ponto") }
                        }
                    }
                }
            } else {
            TextButton(enabled = !saving, onClick = { save { showMap = true } }) { Text("← Percurso · módulo ${moduleIndex + 1} de ${modules.size}") }
            LazyColumn(state = list, modifier = Modifier.weight(1f).studyPointMotion("$moduleId:${page.id}", moduleIndex * 1000 + pageIndex), contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { StudyRail(pages.map { it.title }, pageIndex, "Etapas do módulo", enabled = { !saving }, compact = true, choose = ::choosePage) }
                item(key = "$moduleId:${page.id}") { Column(Modifier.revealSection(1)) {
                    if (current.objects("lessons").size > 1 && page.lessonTitle != null) Text(page.lessonTitle, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
                    Heading(page.title)
                    when (page.kind) {
                        StudyPageKind.OBJECTIVES -> {
                            if (moduleIndex == 0) {
                                Text(course.getString("description"), Modifier.padding(bottom = 16.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)
                            }
                            StudyParagraphs(listOf(current.getString("description")))
                            current.strings("objectives").forEach { Text("• $it", Modifier.padding(bottom = 12.dp)) }
                        }
                        StudyPageKind.LESSON_SECTION -> page.content?.let { section ->
                            StudySection(section)
                            if (current.objects("foundation").isNotEmpty()) StudyFoundation(current.objects("foundation"))
                            else StudyReferences(course.objects("references").filter { it.optString("id") in section.strings("references") })
                            if (page.lastInLesson && page.lessonId != null) StudyCheck("Li esta aula", page.lessonId in work.strings("lessons"), !saving) { toggle("lessons", page.lessonId) }
                        }
                        StudyPageKind.READINGS -> {
                            current.optString("studyGuideId").takeIf(String::isNotBlank)?.let { guideId ->
                                val assigned = if (current.has("libraryWorks")) current.objects("libraryWorks") else null
                                val readingId = if (assigned != null) "study-course:${course.getString("id").removePrefix("course:")}:$moduleId" else "study-guide:$guideId"
                                StudyReadings(readingId, current.optString("readingSearch", current.getString("title")), repository, { target -> save { openLibrary(target) } }, assignedWorks = assigned)
                            }
                            current.objects("passages").forEach { passage ->
                                val ref = passage.getJSONObject("ref")
                                PassageButton(repository, ref.getString("bookId"), ref.getInt("chapter"), passage.getString("label"), ref.optInt("verseStart").takeIf { it > 0 }, ref.optInt("verseEnd").takeIf { it > 0 }) { target -> save { open(target) } }
                                Text(passage.getString("purpose"), style = MaterialTheme.typography.bodyMedium)
                                StudyCheck("Li e observei: ${passage.getString("label")}", passage.getString("id") in work.strings("readings"), !saving) { toggle("readings", passage.getString("id")) }
                                HorizontalDivider(Modifier.padding(vertical = 12.dp))
                            }
                            if (current.objects("connections").isNotEmpty()) Heading("Conexões")
                            current.objects("connections").forEach { connection ->
                                Text(connection.getString("label"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                                Text(connection.getString("explanation"), Modifier.padding(vertical = 10.dp), style = MaterialTheme.typography.bodyMedium)
                                connection.optJSONObject("ref")?.let { ref ->
                                    PassageButton(repository, ref.getString("bookId"), ref.getInt("chapter"), "Ler ${connection.getString("label")}", ref.optInt("verseStart").takeIf { it > 0 }, ref.optInt("verseEnd").takeIf { it > 0 }) { target -> save { open(target) } }
                                }
                            }
                            if (current.objects("videos").isNotEmpty()) Heading("Vídeos do módulo")
                            current.objects("videos").forEach { StudyVideo(it) }
                        }
                        StudyPageKind.ACTIVITY -> {
                            StudyParagraphs(listOf(current.getJSONObject("activity").getString("prompt")))
                            OutlinedButton(onClick = { noteSource = "study-course:${course.getString("id").removePrefix("course:")}:module:$moduleId" }) { Text("Abrir meu caderno") }
                            OutlinedTextField(work.optString("response"), { work = JSONObject(work.toString()).put("response", it.take(30000)) },
                                enabled = !saving, label = { Text("Sua resposta, com fontes") }, modifier = Modifier.fillMaxWidth().heightIn(min = 200.dp))
                            Text("A resposta é salva ao trocar de etapa ou usar Salvar rascunho.", Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                        }
                        StudyPageKind.REVIEW -> {
                            val checked = work.optJSONArray("criteria")?.let { array -> (0 until array.length()).map(array::getInt) }.orEmpty()
                            current.getJSONObject("activity").strings("criteria").forEachIndexed { index, label ->
                                StudyCheck(label, index in checked, !saving) { work = JSONObject(work.toString()).put("criteria", JSONArray(if (index in checked) checked - index else checked + index)) }
                            }
                            Text("${work.strings("lessons").size} aulas confirmadas · ${work.strings("readings").size} leituras confirmadas", Modifier.padding(vertical = 12.dp), style = MaterialTheme.typography.labelLarge)
                            StudyReferences(course.objects("references"))
                            message?.let { Text(it, Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.error) }
                            Button(enabled = !saving, onClick = { save(complete = true) }, modifier = Modifier.padding(top = 16.dp)) { Text("Concluir módulo") }
                            if (moduleIndex < modules.lastIndex && StudySequence.unlocked(modules, moduleIndex + 1, progress)) {
                                TextButton(enabled = !saving, onClick = { save { selected = moduleIndex + 1; stage = 0 } }) { Text("Abrir próximo módulo") }
                            }
                        }
                        else -> Unit
                    }
                    if (page.kind != StudyPageKind.REVIEW) message?.let { Text(it, Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.secondary) }
                    TextButton(enabled = !saving, onClick = { save { message = "Rascunho salvo." } }) { Text(if (saving) "Salvando…" else "Salvar rascunho") }
                } }
            }
            StudyNavigation(pageIndex, pages.size, !saving, ::choosePage)
            }
        }
    }
    noteSource?.let { source -> NoteEditor(personal, null, source) { noteSource = null } }
}

@Composable
private fun StudySection(section: JSONObject) {
    val kind = section.optString("kind")
    val label = when (kind) { "introduction" -> "A PERGUNTA"; "concept" -> "PARA COMPREENDER"; "example" -> "OBSERVAR NO TEXTO"; "discussion" -> "PARA INVESTIGAR"; "conclusion" -> "O QUE LEVAR DESTA ETAPA"; else -> "LEITURA" }
    Text(label, Modifier.padding(bottom = 14.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
    if (kind == "example" || kind == "conclusion") {
        Surface(color = if (kind == "example") MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.tertiaryContainer, shape = MaterialTheme.shapes.medium) {
            Column(Modifier.padding(18.dp)) { StudyParagraphs(section.strings("paragraphs")) }
        }
    } else StudyParagraphs(section.strings("paragraphs"))
}

@Composable
private fun StudyCheck(label: String, checked: Boolean, enabled: Boolean, change: () -> Unit) {
    Row(Modifier.fillMaxWidth().toggleable(value = checked, enabled = enabled, role = androidx.compose.ui.semantics.Role.Checkbox, onValueChange = { change() }).padding(vertical = 4.dp)) {
        Checkbox(checked, onCheckedChange = null, enabled = enabled)
        Text(label, Modifier.weight(1f).padding(top = 12.dp), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
internal fun StudyReferences(references: List<JSONObject>) {
    val context = LocalContext.current
    var error by remember { mutableStateOf(false) }
    var expanded by remember(references.map { it.optString("id") }) { mutableStateOf(false) }
    if (references.isNotEmpty()) {
        TextButton(onClick = { expanded = !expanded }) { Text("Referências · ${references.size} ${if (expanded) "▴" else "▾"}") }
        if (expanded) references.forEach { reference ->
            Text(reference.optString("title"), style = MaterialTheme.typography.bodyMedium)
            Text(listOf(reference.optString("author"), reference.optString("perspective")).filter { it.isNotBlank() }.joinToString(" · "), Modifier.padding(bottom = 12.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
            val url = safeExternalUrl(reference.optString("url"))
            if (url != null) TextButton(onClick = { error = runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }.isFailure }) { Text("Consultar fonte original ↗") }
        }
        if (error) Text("Não foi possível abrir a fonte. Tente com um navegador disponível.", color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun StudyVideo(video: JSONObject) {
    val context = LocalContext.current
    var error by remember { mutableStateOf(false) }
    TextButton(onClick = {
        val url = safeExternalUrl(video.getString("url"))
        error = url == null || runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }.isFailure
    }) { Text("Vídeo: ${video.getString("title")}") }
    Text(video.optString("purpose"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
    if (error) Text("Não foi possível abrir o vídeo neste aparelho.", color = MaterialTheme.colorScheme.error)
}
