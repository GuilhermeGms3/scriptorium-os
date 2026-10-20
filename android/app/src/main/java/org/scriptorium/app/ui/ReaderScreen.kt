package org.scriptorium.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.scriptorium.app.content.Edition
import org.scriptorium.app.data.*

@Composable
fun ReaderScreen(repository: MobileRepository, personal: PersonalRepository, requested: Passage?) {
    Load("scripture-editions", repository::scriptureEditions) { editions ->
        if (editions.isEmpty()) Text("Nenhuma edição bíblica instalada. Instale um pacote em Mais → Pacotes.", Modifier.padding(24.dp))
        else ReaderContent(repository, personal, requested, editions)
    }
}

@Composable
private fun ReaderContent(repository: MobileRepository, personal: PersonalRepository, requested: Passage?, editions: List<Edition>) {
    val context = LocalContext.current
    val preferences = remember { ReadingPreferences(context) }
    val passageSaver = Saver<Passage?, String>(save = { it?.encoded().orEmpty() }, restore = { decodePassage(it, editions) })
    var passage by rememberSaveable(requested, stateSaver = passageSaver) { mutableStateOf(requested ?: decodePassage(preferences.lastPassage(), editions)) }
    var editionId by rememberSaveable(requested) { mutableStateOf(passage?.edition?.id ?: editions.first().id) }
    val edition = editions.firstOrNull { it.id == editionId } ?: editions.first()
    var bookId by rememberSaveable { mutableStateOf<String?>(null) }
    var explanations by rememberSaveable { mutableStateOf(true) }
    var selected by remember { mutableStateOf<Row?>(null) }
    var primary by remember { mutableStateOf<Row?>(null) }
    var page by remember { mutableStateOf<Row?>(null) }
    var editionMenu by remember { mutableStateOf(false) }
    var jump by rememberSaveable { mutableStateOf(false) }
    var mode by rememberSaveable { mutableStateOf("Leitura") }
    var noteUnit by remember { mutableStateOf<String?>(null) }
    var panelOpen by rememberSaveable { mutableStateOf(false) }
    var visibleVerse by rememberSaveable(passage?.edition?.id, passage?.workId, passage?.chapter) { mutableStateOf(passage?.verse) }
    var category by rememberSaveable { mutableStateOf<String?>(null) }
    var document by rememberSaveable { mutableStateOf<String?>(null) }
    var feedback by remember { mutableStateOf<String?>(null) }
    var readerHistory by rememberSaveable(requested) { mutableStateOf(listOf<String>()) }
    val scope = rememberCoroutineScope()
    fun rememberPage() {
        readerHistory = (readerHistory + org.json.JSONObject().put("edition", editionId).put("book", bookId).put("passage", passage?.encoded()).toString()).takeLast(30)
    }
    fun open(value: Passage) { if (value != passage) rememberPage(); editionId = value.edition.id; passage = value; mode = "Leitura"; preferences.savePassage(value) }
    fun openTool(value: String) {
        passage = passage?.copy(verse = visibleVerse, verseEnd = null)
        mode = value
        panelOpen = false
    }
    BackHandler(readerHistory.isNotEmpty() || mode != "Leitura") {
        if (mode != "Leitura") mode = "Leitura" else {
            val previous = org.json.JSONObject(readerHistory.last())
            readerHistory = readerHistory.dropLast(1)
            editionId = previous.getString("edition")
            bookId = if (previous.isNull("book")) null else previous.getString("book")
            passage = decodePassage(if (previous.isNull("passage")) null else previous.getString("passage"), editions)
        }
    }
    primary?.let { PrimaryReader(repository, personal, it) { primary = null }; return }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = { if (passage != null || bookId != null) rememberPage(); passage = null; bookId = null }, modifier = Modifier.weight(1f)) {
                    Column(Modifier.fillMaxWidth()) {
                        Text(passage?.let { "${it.title} ${it.chapter} ▾" } ?: "Escolher livro", maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                        Text(edition.title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                    }
                }
                if (passage != null) TextButton(onClick = { panelOpen = true }) { Text("Painel") }
                Box {
                    IconButton(onClick = { editionMenu = true }, modifier = Modifier.semantics { contentDescription = "Escolher edição" }) { Text("⋮") }
                    DropdownMenu(expanded = editionMenu, onDismissRequest = { editionMenu = false }) {
                        editions.forEach { item -> DropdownMenuItem(text = { Text(item.title) }, onClick = {
                            rememberPage(); editionId = item.id; passage = null; bookId = null; editionMenu = false
                        }) }
                    }
                }
            }
            feedback?.let { Text(it, Modifier.padding(horizontal = 20.dp), style = MaterialTheme.typography.labelSmall) }
            val current = passage
            if (current == null) ReadingBookPicker(repository, edition, bookId, { rememberPage(); bookId = it }, ::open, { primary = it }, { page = it })
            else {
                if (mode != "Leitura") TextButton(onClick = { mode = "Leitura" }) { Text("← Voltar à leitura · $mode") }
                if (mode != "Leitura") PassageMode(repository, personal, current, mode)
                else ReaderChapter(repository, personal, current, explanations, category, document, preferences, ::open, { selected = it }, { noteUnit = it }, { verse ->
                    scope.launch {
                        try {
                            withContext(Dispatchers.IO) { personal.bookmark(org.json.JSONObject().put("editionId", current.edition.id).put("workId", current.workId).put("bookId", current.bookId).put("chapter", current.chapter).put("scheme", current.scheme).put("unitId", verse.text("id")), "${current.title} ${current.chapter}:${verse.text("verse_start")}") }
                            feedback = "Favorito salvo em Ajustes e backup."
                        } catch (failure: Exception) { feedback = failure.message }
                    }
                }, { openTool("Texto original") }, { verse ->
                    visibleVerse = verse?.number("verse_start") ?: visibleVerse
                    panelOpen = true
                }, { verse -> visibleVerse = verse.number("verse_start") })
            }
        }
        ExtendedFloatingActionButton(onClick = { jump = true }, modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp).semantics { contentDescription = "Ir para…" },
            icon = { Text("⌕") }, text = { Text("Ir para…") })
    }
    if (panelOpen && passage != null) PassagePanel(repository, personal, requireNotNull(passage).copy(verse = visibleVerse, verseEnd = null),
        explanations, { explanations = it }, category, document, { category = it }, { document = it }, { selected = it },
        ::openTool, { panelOpen = false })
    if (jump) PassageJumpDialog(repository, edition, onClose = { jump = false }) { open(it); jump = false }
    selected?.let { SourceDialog(repository, personal, it) { selected = null } }
    page?.let { PageDialog(repository, it, personal) { page = null } }
    noteUnit?.let { NoteEditor(personal, null, it) { noteUnit = null } }
}
