package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.saveable.rememberSaveable
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.ui.unit.sp
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import org.json.JSONObject
import org.scriptorium.app.data.*

@Composable
internal fun StudyParagraphs(paragraphs: List<String>) {
    paragraphs.forEach { paragraph ->
        Text(paragraph, Modifier.fillMaxWidth().padding(bottom = 18.dp),
            style = MaterialTheme.typography.bodyLarge, fontFamily = LocalReadingAppearance.current.fontFamily, fontSize = (LocalReadingAppearance.current.size * 0.86f).sp, lineHeight = (LocalReadingAppearance.current.size * 1.35f).sp)
    }
}

@Composable
internal fun StudyNavigation(index: Int, count: Int, enabled: Boolean = true, choose: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        OutlinedButton(enabled = enabled && index > 0, onClick = { choose(index - 1) }) { Text("Anterior") }
        if (index < count - 1) Button(enabled = enabled, onClick = { choose(index + 1) }) { Text("Próxima etapa") }
        else Text("Fim das etapas", Modifier.padding(12.dp), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
    }
}

@Composable
internal fun GuideScreen(guide: JSONObject, lesson: JSONObject?, repository: MobileRepository, personal: PersonalRepository, open: (Passage) -> Unit, openLibrary: (StudyReading?) -> Unit) {
    val pages = remember(guide, lesson) { StudySequence.guide(guide, lesson) }
    val guideId = "guide:${guide.getString("id") }"
    val scope = rememberCoroutineScope()
    var selected by rememberSaveable(guideId) { mutableIntStateOf(-1) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf(false) }
    Load(guideId, { personal.progress(guideId, 1) }) { loaded ->
        var completed by remember(guideId) { mutableStateOf(loaded.filter { !it["completed_at"].isNullOrBlank() }.map { it.text("module_id") }.toSet()) }
        fun unlocked(index: Int) = StudySequence.readingUnlocked(pages.map { it.id }, index, completed)
        val index = selected.takeIf { unlocked(it) } ?: pages.indexOfFirst { it.id !in completed }.takeIf { it >= 0 } ?: pages.lastIndex
        val page = pages[index]
        val list = rememberLazyListState()
        LaunchedEffect(index) { list.scrollToItem(0) }
        Column(Modifier.fillMaxSize()) {
            Text(guide.getString("title"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
            StudyRail(pages.map { it.title }, index, "Etapas de leitura", enabled = { !saving && unlocked(it) }, completed = { pages[it].id in completed }) { selected = it }
            LazyColumn(state = list, modifier = Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp)) {
                item(key = page.id) { Column {
                    Heading(page.title)
                    when (page.kind) {
                        StudyPageKind.INTRODUCTION -> {
                            StudyParagraphs(listOf(guide.getString("introduction")))
                            Text("Conclua um ponto para liberar o seguinte. Consulte as fontes e registre sua síntese. O avanço é uma marcação pessoal de estudo, não uma certificação acadêmica.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                        }
                        StudyPageKind.GUIDE_MODULE -> page.content?.let { module ->
                            StudyParagraphs(listOf(module.getString("explanation")))
                            if (module.strings("questions").isNotEmpty()) {
                                Text("PARA INVESTIGAR", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                                module.strings("questions").forEach { Text(it, Modifier.padding(vertical = 10.dp), style = MaterialTheme.typography.titleMedium) }
                            }
                            module.objects("passages").forEach { passage -> PassageButton(repository, passage.getString("book"), passage.getInt("chapter"), passage.getString("label"), open) }
                        }
                        StudyPageKind.CHAPTER -> StudyParagraphs(page.content?.strings("paragraphs").orEmpty())
                        StudyPageKind.SOURCES -> StudyReadings("study-guide:${guide.getString("id")}", guide.getString("title"), repository, openLibrary)
                        StudyPageKind.NOTEBOOK -> {
                            Text("Reúna suas observações e referências em uma nota vinculada a este tema.", style = MaterialTheme.typography.bodyLarge)
                            Button(onClick = { note = true }, modifier = Modifier.padding(top = 16.dp)) { Text("Registrar minha investigação") }
                        }
                        else -> Unit
                    }
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        OutlinedButton(enabled = !saving && index > 0, onClick = { selected = index - 1 }) { Text("Anterior") }
                        Button(enabled = !saving && !(index == pages.lastIndex && page.id in completed), onClick = {
                            saving = true; error = null
                            scope.launch {
                                try {
                                    withContext(Dispatchers.IO) { personal.saveProgress(guideId, 1, page.id, "{}", true) }
                                    completed = completed + page.id
                                    if (index < pages.lastIndex) selected = index + 1
                                } catch (failure: Exception) { error = "Não foi possível guardar o avanço. ${failure.message.orEmpty()}" }
                                finally { saving = false }
                            }
                        }) { Text(if (saving) "Salvando…" else if (index == pages.lastIndex && page.id in completed) "Guia concluído ✓" else if (index == pages.lastIndex) "Concluir guia" else "Concluir ponto e avançar") }
                    }
                } }
            }
        }
    }
    if (note) NoteEditor(personal, null, "study-guide:${guide.getString("id")}") { note = false }
}

@Composable
internal fun LessonSequence(id: String, lesson: JSONObject, repository: MobileRepository, personal: PersonalRepository, openLibrary: (StudyReading?) -> Unit) {
    val chapters = lesson.objects("chapters")
    val pageIds = chapters.map { it.getString("id") } + listOf("library", "synthesis")
    val titles = chapters.mapIndexed { index, chapter -> if (index == 0) "Início · ${chapter.getString("title")}" else chapter.getString("title") } + listOf("Leituras do acervo", "Minha síntese")
    var selected by rememberSaveable(id) { mutableIntStateOf(0) }
    var note by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val list = rememberLazyListState()
    LaunchedEffect(selected) { list.scrollToItem(0) }
    BackHandler(selected > 0) { selected-- }
    Load(id, { personal.progress("lesson:$id", 1) }) { progress ->
        var completed by remember(id) { mutableStateOf(progress.filter { !it["completed_at"].isNullOrBlank() }.map { it.text("module_id") }.toSet()) }
        Column(Modifier.fillMaxSize()) {
            Text(lesson.getString("title"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
            LinearProgressIndicator(progress = { completed.size.toFloat() / pageIds.size }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
            StudyRail(titles, selected, "Etapas da aula", enabled = { !saving && StudySequence.readingUnlocked(pageIds, it, completed) }, completed = { pageIds[it] in completed }) { selected = it }
            LazyColumn(state = list, modifier = Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item(key = pageIds[selected]) {
                    Column {
                        when {
                            selected < chapters.size -> {
                                Heading(chapters[selected].getString("title"))
                                StudyParagraphs(chapters[selected].strings("paragraphs"))
                                StudyReadings(id, lesson.getString("title"), repository, openLibrary)
                            }
                            selected == chapters.size -> { Heading("Leituras do acervo"); StudyReadings(id, lesson.getString("title"), repository, openLibrary) }
                            else -> {
                                Heading("Minha síntese", "Registre o que compreendeu, suas dúvidas e as fontes consultadas.")
                                Button(onClick = { note = true }) { Text("Escrever minha síntese") }
                                Text("As etapas lidas são uma marcação pessoal, não uma certificação de domínio.", Modifier.padding(top = 16.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                            }
                        }
                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        Button(enabled = !saving, onClick = {
                            val step = pageIds[selected]; saving = true
                            scope.launch {
                                try {
                                    withContext(Dispatchers.IO) { personal.saveProgress("lesson:$id", 1, step, "{}", true) }
                                    completed = completed + step
                                    if (selected < pageIds.lastIndex) selected++
                                } catch (failure: Exception) { error = "Não foi possível guardar esta etapa. ${failure.message.orEmpty()}" }
                                finally { saving = false }
                            }
                        }, modifier = Modifier.padding(top = 16.dp)) { Text(if (pageIds[selected] in completed) "Etapa lida ✓" else "Marcar etapa como lida") }
                        if (selected > 0) TextButton(enabled = !saving, onClick = { selected-- }) { Text("Anterior") }
                        if (selected < pageIds.lastIndex && pageIds[selected] in completed) TextButton(enabled = !saving, onClick = { selected++ }) { Text("Próximo ponto") }
                    }
                }
            }
        }
    }
    if (note) NoteEditor(personal, null, "lesson:$id") { note = false }
}
