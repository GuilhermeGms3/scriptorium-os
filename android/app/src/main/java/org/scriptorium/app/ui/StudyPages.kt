package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import org.json.JSONObject
import org.scriptorium.app.data.*

@Composable
internal fun StudyParagraphs(paragraphs: List<String>) {
    paragraphs.forEach { paragraph ->
        Text(paragraph, Modifier.fillMaxWidth().padding(bottom = 18.dp),
            style = MaterialTheme.typography.bodyLarge, fontFamily = FontFamily.Serif)
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
internal fun GuideScreen(guide: JSONObject, lesson: JSONObject?, repository: MobileRepository, personal: PersonalRepository, open: (Passage) -> Unit) {
    val pages = remember(guide, lesson) { StudySequence.guide(guide, lesson) }
    var selected by rememberSaveable(guide.getString("id")) { mutableIntStateOf(0) }
    var note by remember { mutableStateOf(false) }
    var primary by remember { mutableStateOf<Row?>(null) }
    primary?.let { PrimaryReader(repository, personal, it) { primary = null }; return }
    val page = pages[selected.coerceIn(pages.indices)]
    val list = rememberLazyListState()
    LaunchedEffect(selected) { list.scrollToItem(0) }
    Column(Modifier.fillMaxSize()) {
        Text(guide.getString("title"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
        StudyRail(pages.map { it.title }, selected, "Etapas de leitura") { selected = it }
        LazyColumn(state = list, modifier = Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp)) {
            item(key = page.id) { Column {
                Heading(page.title)
                when (page.kind) {
                    StudyPageKind.INTRODUCTION -> {
                        StudyParagraphs(listOf(guide.getString("introduction")))
                        Text("Percorra o conteúdo, consulte as leituras e registre sua síntese. As etapas deste guia são de navegação; não certificam conclusão acadêmica.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
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
                    StudyPageKind.SOURCES -> Load(guide.getString("id"), repository::primaryWorks) { works ->
                        Column {
                            if (guide.objects("resources").isEmpty()) Text("Este guia ainda não tem leituras vinculadas.")
                            guide.objects("resources").forEach { resource ->
                                val installed = works.find { it.text("id") == resource.optString("workId") }
                                if (installed != null) TextButton(onClick = { primary = installed }) { Text(resource.getString("label")) }
                                else Text("${resource.getString("label")} · sem edição de leitura instalada", Modifier.padding(vertical = 8.dp))
                            }
                        }
                    }
                    StudyPageKind.NOTEBOOK -> {
                        Text("Reúna suas observações e referências em uma nota vinculada a este tema.", style = MaterialTheme.typography.bodyLarge)
                        Button(onClick = { note = true }, modifier = Modifier.padding(top = 16.dp)) { Text("Registrar minha investigação") }
                    }
                    else -> Unit
                }
                StudyNavigation(selected, pages.size) { selected = it }
            } }
        }
    }
    if (note) NoteEditor(personal, null, "study-guide:${guide.getString("id")}") { note = false }
}

@Composable
internal fun LessonSequence(lesson: JSONObject) {
    val chapters = lesson.objects("chapters")
    var selected by rememberSaveable(lesson.optString("id")) { mutableIntStateOf(0) }
    val list = rememberLazyListState()
    LaunchedEffect(selected) { list.scrollToItem(0) }
    Column(Modifier.fillMaxSize()) {
        Text(lesson.getString("title"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
        if (chapters.isEmpty()) Text("Esta aula não tem capítulos disponíveis.") else {
            StudyRail(chapters.map { it.getString("title") }, selected, "Etapas da aula") { selected = it }
            LazyColumn(state = list, modifier = Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp)) {
                item { Heading(chapters[selected].getString("title")); StudyParagraphs(chapters[selected].strings("paragraphs"))
                    StudyNavigation(selected, chapters.size) { selected = it }
                }
            }
        }
    }
}
