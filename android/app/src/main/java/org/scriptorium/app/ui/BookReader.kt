package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject
import org.scriptorium.app.data.*

/** Dedicated reader: the shelf mounts this only after opening an actual book. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun BookReader(repository: MobileRepository, personal: PersonalRepository, document: Row, pageIndex: Int,
                        changePage: (Int) -> Unit, target: Row?, close: () -> Unit) {
    val id = document.text("id")
    val context = LocalContext.current
    val preferences = remember(context) { ReadingPreferences(context) }
    val appearance = LocalReadingAppearance.current
    val count = document.number("pages").coerceAtLeast(1)
    val index = pageIndex.coerceIn(0, count - 1)
    var tools by remember { mutableStateOf(false) }
    var indexOpen by remember { mutableStateOf(false) }
    var jumpOpen by remember { mutableStateOf(false) }
    var jump by remember { mutableStateOf("") }
    var note by remember { mutableStateOf<Row?>(null) }
    var pdfMode by rememberSaveable(id) { mutableStateOf(target == null || target.number("end_offset") <= target.number("start_offset")) }
    LaunchedEffect(id, index) { preferences.saveBookPage(id, index) }
    Column(Modifier.fillMaxSize()) {
        Surface(tonalElevation = 2.dp) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                TextButton(onClick = close) { Text("← Estante") }
                Text(document.text("title"), Modifier.weight(1f).padding(horizontal = 8.dp), maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleSmall)
                TextButton(onClick = { tools = true }, modifier = Modifier.semantics { contentDescription = "Opções de leitura do livro" }) { Text("Leitura") }
            }
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            Load("book-file:$id", { repository.pdf(document.text("checksum")) }) { pdf ->
                if (pdfMode && pdf != null) Row(Modifier.fillMaxSize()) {
                    ReadingSectionIndicators(count, index, { "Página ${it + 1}" }) { changePage(it) }
                    Box(Modifier.weight(1f)) { key(id, index) { BookPdfPage(pdf, index) } }
                }
                else Load(id to index, { repository.page(id, index) }) { page ->
                    if (page == null || page.text("text").isBlank()) {
                        Column(Modifier.padding(24.dp)) {
                            Text("Esta página não possui texto extraído legível.")
                            if (pdf != null) Button(onClick = { pdfMode = true }) { Text("Ler PDF original") }
                        }
                    } else key(id, index) {
                        val requested = target?.takeIf { it.text("document_id") == id && it.number("page_index") == index }
                        BookAdjustedText(page, index, requested)
                    }
                }
            }
        }
        HorizontalDivider()
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            TextButton(enabled = index > 0, onClick = { changePage(index - 1) }) { Text("← Anterior") }
            TextButton(onClick = { jump = (index + 1).toString(); jumpOpen = true }) { Text("${index + 1} / $count") }
            TextButton(enabled = index + 1 < count, onClick = { changePage(index + 1) }) { Text("Próxima →") }
        }
    }
    if (jumpOpen) AlertDialog(onDismissRequest = { jumpOpen = false }, title = { Text("Ir à página") }, text = {
        OutlinedTextField(jump, { jump = it.filter(Char::isDigit).take(5) }, label = { Text("Página física · 1 a $count") }, singleLine = true)
    }, confirmButton = { TextButton(enabled = (jump.toIntOrNull() ?: 0) in 1..count, onClick = { changePage(jump.toInt() - 1); jumpOpen = false }) { Text("Abrir página") } }, dismissButton = { TextButton(onClick = { jumpOpen = false }) { Text("Cancelar") } })
    if (tools) ModalBottomSheet(onDismissRequest = { tools = false }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Leitura do livro", style = MaterialTheme.typography.titleLarge)
            Text("No texto ajustado, § indica uma divisão visual de leitura, reiniciada em cada página; não é a numeração do autor.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
            Load("book-tools:$id", { repository.pdf(document.text("checksum")) }) { pdf ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (pdf != null) FilterChip(pdfMode, { pdfMode = true; tools = false }, label = { Text("PDF original") })
                    FilterChip(!pdfMode || pdf == null, { pdfMode = false; tools = false }, label = { Text("Texto ajustado") })
                }
            }
            Text("Fonte do texto ajustado", style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                ReadingFont.entries.forEach { font -> FilterChip(appearance.font == font, { preferences.appearance = appearance.copy(font = font) }, label = { Text(when(font) { ReadingFont.SERIF -> "Serifa"; ReadingFont.SANS -> "Sem serifa"; ReadingFont.MONO -> "Mono" }) }) }
            }
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                TextButton(enabled = appearance.size > 18, onClick = { preferences.appearance = appearance.copy(size = appearance.size - 1) }) { Text("A−") }
                Text("${appearance.size} · tamanho do texto")
                TextButton(enabled = appearance.size < 32, onClick = { preferences.appearance = appearance.copy(size = appearance.size + 1) }) { Text("A+") }
            }
            TextButton(onClick = { tools = false; indexOpen = true }) { Text("Índice do livro") }
            Load("book-tools:$id:$index", { repository.page(id, index) }) { page ->
                if (page != null && page.text("text").isNotBlank()) {
                    HorizontalDivider()
                    TextButton(onClick = { note = page; tools = false }) { Text("Anotar esta página") }
                    TranslationBlock(page.text("text"), page.text("language"), personal)
                    AudioTextActions("${document.text("title")} · p. ${index + 1}", page.text("text"), page.text("language"), JSONObject().put("kind", "document").put("documentId", id).put("pageId", page.text("id")).put("pageIndex", index).put("checksum", page.text("checksum")))
                } else Text("Tradução e áudio precisam de texto extraído nesta página.", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
    if (indexOpen) ModalBottomSheet(onDismissRequest = { indexOpen = false }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Text("Índice do livro", Modifier.padding(20.dp), style = MaterialTheme.typography.titleLarge)
        Load("book-index:$id", { repository.outline(id) }) { outline ->
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 460.dp), contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp)) {
                if (outline.isEmpty()) item { Text("Este livro ainda não possui índice estruturado. Use o número da página para navegar.") }
                items(outline, key = { it.text("id") }) { section -> TextButton(onClick = { changePage(section.number("page_start").coerceIn(0, count - 1)); indexOpen = false }, modifier = Modifier.fillMaxWidth()) { Text("${section.text("title")} · p. ${section.number("page_start") + 1}") } }
            }
        }
    }
    note?.let { page -> NoteEditor(personal, null, page.text("id")) { note = null } }
}
