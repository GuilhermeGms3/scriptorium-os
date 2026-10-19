package org.scriptorium.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import org.json.JSONArray
import org.json.JSONObject
import org.scriptorium.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun StudyScreen(repository: MobileRepository, personal: PersonalRepository, openPassage: (Passage) -> Unit) {
    var guide by rememberSaveable { mutableStateOf<String?>(null) }
    var course by rememberSaveable { mutableStateOf<String?>(null) }
    var lessonId by rememberSaveable { mutableStateOf<String?>(null) }
    var lessonsOpen by rememberSaveable { mutableStateOf(false) }
    var lessonQuery by rememberSaveable { mutableStateOf("") }
    val currentGuide = guide
    val currentCourse = course
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        if (lessonId != null) {
            TextButton(onClick = { lessonId = null }) { Text("Voltar às aulas") }
            Load(lessonId, { repository.catalogItem(requireNotNull(lessonId)) }) { lesson ->
                if (lesson != null) LazyColumn(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    item { Heading(lesson.getString("title")) }
                    items(lesson.objects("chapters"), key = { it.getString("id") }) { chapter -> Column {
                        Heading(chapter.getString("title")); chapter.strings("paragraphs").forEach { Text(it, Modifier.padding(bottom = 12.dp)) }
                    } }
                }
            }
        } else if (currentCourse != null) {
            TextButton(onClick = { course = null }) { Text("Voltar aos percursos") }
            Load(currentCourse, { repository.catalogItem(currentCourse) }) { json -> if (json != null) CourseScreen(json, repository, personal, openPassage) }
        } else if (currentGuide != null) {
            TextButton(onClick = { guide = null }) { Text("Voltar à árvore") }
            Load(currentGuide, { repository.catalogItem("guide:$currentGuide") to repository.catalogItem("lesson:study-guide:$currentGuide") }) { (json, lesson) ->
                if (json != null) GuideScreen(json, lesson, repository, personal, openPassage)
            }
        } else Load("study-map", { repository.catalogItem("study-map") to listOf(repository.catalog("guide"), repository.catalog("course"), repository.catalog("lesson")) }) { (map, catalogs) ->
            val guides = catalogs[0]; val courses = catalogs[1]; val lessons = catalogs[2]
            LazyColumn {
                item { Heading("Teologia", "Os mesmos guias e aulas do desktop, com progresso pessoal neste aparelho.") }
                if (map != null) item {
                    val nodes = map.objects("nodes")
                    KnowledgeGraph(nodes.map { GraphNode(it.getString("id"), it.getString("shortTitle"), it.getDouble("x").toFloat(), it.getDouble("y").toFloat()) },
                        map.objects("edges").map { GraphEdge(it.getString("from"), it.getString("to")) }) { id -> guide = nodes.first { it.getString("id") == id }.getString("guideId") }
                }
                item { Heading("Percursos acadêmicos") }
                items(courses, key = { it.text("id") }) { row -> TextButton(onClick = { course = row.text("id") }, modifier = Modifier.fillMaxWidth()) { Text(row.text("title")) } }
                item { Heading("Guias de estudo") }
                items(guides, key = { it.text("id") }) { row -> TextButton(onClick = { guide = row.text("id").removePrefix("guide:") }, modifier = Modifier.fillMaxWidth()) { Text(row.text("title")) } }
                item { TextButton(onClick = { lessonsOpen = !lessonsOpen }) { Text("Aulas temáticas · ${lessons.size} ${if (lessonsOpen) "▴" else "▾"}") } }
                if (lessonsOpen) {
                    item { OutlinedTextField(lessonQuery, { lessonQuery = it.take(200) }, label = { Text("Encontrar aula") }, modifier = Modifier.fillMaxWidth()) }
                    items(lessons.filter { it.text("title").contains(lessonQuery, true) }, key = { it.text("id") }) { row -> TextButton(onClick = { lessonId = row.text("id") }) { Text(row.text("title")) } }
                }
            }
        }
    }
}

@Composable
private fun GuideScreen(guide: JSONObject, lesson: JSONObject?, repository: MobileRepository, personal: PersonalRepository, open: (Passage) -> Unit) {
    var note by remember { mutableStateOf(false) }
    var primary by remember { mutableStateOf<Row?>(null) }
    primary?.let { PrimaryReader(repository, personal, it) { primary = null }; return }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Heading(guide.getString("title"), guide.getString("introduction")) }
        items(guide.objects("modules")) { module ->
            Column {
                Heading(module.getString("title")); Text(module.getString("explanation"))
                module.strings("questions").forEach { Text("• $it", Modifier.padding(top = 12.dp)) }
                module.objects("passages").forEach { passage -> PassageButton(repository, passage.getString("book"), passage.getInt("chapter"), passage.getString("label"), open) }
            }
        }
        if (lesson != null) items(lesson.objects("chapters"), key = { it.getString("id") }) { chapter ->
            Column { Heading(chapter.getString("title")); chapter.strings("paragraphs").forEach { Text(it, Modifier.padding(bottom = 12.dp)) } }
        }
        item { Heading("Leituras do acervo") }
        item { Load(guide.getString("id"), repository::primaryWorks) { works ->
            Column { guide.objects("resources").forEach { resource ->
                val installed = works.find { it.text("id") == resource.optString("workId") }
                if (installed != null) TextButton(onClick = { primary = installed }) { Text(resource.getString("label")) }
                else Text("${resource.getString("label")} · sem edição de leitura instalada", Modifier.padding(vertical = 8.dp))
            } }
        } }
        item { Button(onClick = { note = true }) { Text("Registrar minha investigação") } }
        item { Spacer(Modifier.height(24.dp)) }
    }
    if (note) NoteEditor(personal, null, "study-guide:${guide.getString("id")}") { note = false }
}

@Composable
fun PassageButton(repository: MobileRepository, book: String, chapter: Int, label: String, open: (Passage) -> Unit) {
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    TextButton(onClick = { scope.launch {
        val passage = withContext(Dispatchers.IO) {
            repository.editions().firstNotNullOfOrNull { edition ->
                repository.books(edition).find { it.text("book_id") == book && it.number("chapters") >= chapter }?.let { row -> Passage(edition, row.text("id"), book, row.text("title"), chapter, row.text("scheme")) }
            }
        }
        if (passage != null) open(passage) else error = "Passagem não disponível nas edições instaladas."
    } }) { Text(label) }
    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
}

@Composable
private fun CourseScreen(course: JSONObject, repository: MobileRepository, personal: PersonalRepository, open: (Passage) -> Unit) {
    val modules = course.objects("modules")
    var selected by rememberSaveable { mutableIntStateOf(0) }
    var revision by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    Load(course.getString("id") to revision, { personal.progress(course.getString("id"), course.getInt("revision")) }) { progress ->
        val current = modules[selected]
        val moduleId = current.getString("id")
        var work by rememberSaveable(moduleId, revision, stateSaver = Saver<JSONObject, String>(save = { it.toString() }, restore = { JSONObject(it) })) { mutableStateOf(progress.find { it.text("module_id") == moduleId }?.get("work_json")?.let(::JSONObject) ?: JSONObject().put("lessons", JSONArray()).put("readings", JSONArray()).put("response", "").put("criteria", JSONArray())) }
        var message by remember(moduleId) { mutableStateOf<String?>(null) }
        var saving by remember { mutableStateOf(false) }
        fun toggle(key: String, value: String) {
            val values = work.strings(key).toMutableList()
            if (value in values) values.remove(value) else values.add(value)
            work = JSONObject(work.toString()).put(key, JSONArray(values))
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Heading(course.getString("title"), course.getString("description")) }
            item { Column { modules.forEachIndexed { index, module ->
                val unlocked = modules.take(index).all { prior -> progress.any { it.text("module_id") == prior.getString("id") && !it["completed_at"].isNullOrEmpty() } }
                TextButton(enabled = unlocked && !saving, onClick = { saving = true; scope.launch {
                    try {
                        val completed = progress.any { it.text("module_id") == moduleId && !it["completed_at"].isNullOrEmpty() }
                        withContext(Dispatchers.IO) { personal.saveProgress(course.getString("id"), course.getInt("revision"), moduleId, work.toString(), completed) }
                        selected = index; revision++
                    } catch (failure: Exception) { message = failure.message } finally { saving = false }
                } }) { Text("${if (progress.any { it.text("module_id") == module.getString("id") && !it["completed_at"].isNullOrEmpty() }) "✓" else "○"} ${module.getString("title")}${if (!unlocked) " · concluir anterior" else ""}") }
            } } }
            item { Heading(current.getString("title"), current.getString("description")) }
            item { Column { current.strings("objectives").forEach { Text("• $it", Modifier.padding(bottom = 8.dp)) } } }
            current.objects("lessons").forEach { lesson ->
                item { Heading(lesson.getString("title")) }
                items(lesson.objects("sections")) { section -> Column { Text(section.getString("title"), style = MaterialTheme.typography.titleMedium); section.strings("paragraphs").forEach { Text(it, Modifier.padding(top = 10.dp)) } } }
                item { Row { Checkbox(lesson.getString("id") in work.strings("lessons"), { toggle("lessons", lesson.getString("id")) }); Text("Li esta aula", Modifier.padding(top = 12.dp)) } }
            }
            items(current.objects("passages")) { passage ->
                val ref = passage.getJSONObject("ref")
                Column { PassageButton(repository, ref.getString("bookId"), ref.getInt("chapter"), passage.getString("label"), open)
                    Text(passage.getString("purpose"))
                    Row { Checkbox(passage.getString("id") in work.strings("readings"), { toggle("readings", passage.getString("id")) }); Text("Li e observei a passagem", Modifier.padding(top = 12.dp)) }
                }
            }
            item {
                Heading("Atividade", current.getJSONObject("activity").getString("prompt"))
                OutlinedTextField(work.optString("response"), { work = JSONObject(work.toString()).put("response", it.take(30000)) }, label = { Text("Sua resposta, com fontes") }, modifier = Modifier.fillMaxWidth().heightIn(min = 180.dp))
            }
            items(current.getJSONObject("activity").strings("criteria").withIndex().toList()) { (index, label) ->
                val checked = work.optJSONArray("criteria")?.let { array -> (0 until array.length()).map(array::getInt) }.orEmpty()
                Row { Checkbox(index in checked, {
                    work = JSONObject(work.toString()).put("criteria", JSONArray(if (index in checked) checked - index else checked + index))
                }); Text(label, Modifier.weight(1f).padding(top = 10.dp)) }
            }
            items(current.objects("videos")) { video -> TextButton(onClick = { safeExternalUrl(video.getString("url"))?.let { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it))) } }) { Text("Vídeo: ${video.getString("title")}") } }
            item { Heading("Referências do percurso") }
            items(course.objects("references")) { reference -> Column { Text(reference.optString("title")); Text(reference.optString("author"), style = MaterialTheme.typography.bodySmall) } }
            item {
                message?.let { Text(it) }
                Row {
                    Button(enabled = !saving, onClick = { saving = true; scope.launch {
                        try {
                            val completed = progress.any { it.text("module_id") == moduleId && !it["completed_at"].isNullOrEmpty() } && CoursePolicy.issues(current, work).isEmpty()
                            withContext(Dispatchers.IO) { personal.saveProgress(course.getString("id"), course.getInt("revision"), moduleId, work.toString(), completed) }
                            message = if (completed) "Alterações salvas; conclusão preservada." else "Rascunho salvo; confira os critérios antes de concluir."; revision++
                        }
                        catch (failure: Exception) { message = failure.message } finally { saving = false }
                    } }) { Text("Salvar") }
                    TextButton(enabled = !saving, onClick = {
                        val issues = CoursePolicy.issues(current, work)
                        if (issues.isNotEmpty()) message = issues.joinToString("\n") else { saving = true; scope.launch {
                            try { withContext(Dispatchers.IO) { personal.saveProgress(course.getString("id"), course.getInt("revision"), moduleId, work.toString(), true) }; revision++; message = "Módulo concluído. O próximo está disponível." }
                            catch (failure: Exception) { message = failure.message } finally { saving = false }
                        } }
                    }) { Text("Concluir módulo") }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}
