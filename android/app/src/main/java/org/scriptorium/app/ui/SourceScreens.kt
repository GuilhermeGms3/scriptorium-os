package org.scriptorium.app.ui

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*

@Composable
fun SourceDialog(repository: MobileRepository, personal: PersonalRepository, comment: Row, close: () -> Unit) {
    var note by remember { mutableStateOf(false) }
    var libraryPage by remember { mutableStateOf<Row?>(null) }
    AlertDialog(onDismissRequest = close, confirmButton = { TextButton(onClick = close) { Text("Fechar") } }, title = { Text(comment.text("source_title")) }, text = {
        Column(Modifier.heightIn(max = 560.dp).verticalScroll(rememberScrollState())) {
            Text(comment.text("body"))
            Text(comment.commentLabel(), style = MaterialTheme.typography.labelSmall)
            Heading("Por que foi ligado")
            Text(comment.text("rationale"))
            Text("Método: ${comment.text("method")}\nRevisão: ${reviewLabel(comment.text("review_status"))}", style = MaterialTheme.typography.bodySmall)
            Load(comment.text("id"), { repository.evidence(comment.text("id")) to repository.trace(comment.text("id")) }) { (evidence, trace) ->
                evidence.forEach { page ->
                    val text = page.text("text")
                    val start = page.number("start_offset").coerceIn(0, text.length)
                    val end = page.number("end_offset").coerceIn(start, text.length)
                    Heading("Página ${page.number("page_index") + 1}")
                    SelectionContainer { Text(text.substring(start, end)) }
                    TextButton(onClick = { libraryPage = page }) { Text("Abrir página na Biblioteca") }
                }
                Heading("Rastro da ligação")
                if (trace.isEmpty()) Text("Sem eventos históricos exportados para esta ligação.")
                trace.forEach { event -> Text("${event.text("occurred_at")} · ${traceLabel(event.text("event_kind"))}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(vertical = 4.dp)) }
            }
            Button(onClick = { note = true }, modifier = Modifier.padding(top = 16.dp)) { Text("Criar nota sobre esta fonte") }
        }
    })
    if (note) NoteEditor(personal, null, comment.text("id"), onClose = { note = false })
    libraryPage?.let { PageDialog(repository, it) { libraryPage = null } }
}

@Composable
fun LibraryScreen(repository: MobileRepository) {
    var document by remember { mutableStateOf<Row?>(null) }
    var pageIndex by rememberSaveable { mutableIntStateOf(0) }
    var selected by remember { mutableStateOf<Row?>(null) }
    val current = document
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Heading("Biblioteca", "Livros do pacote instalado. Texto extraído e PDF original são identificados separadamente.")
        if (current == null) Load("documents", repository::documents) { documents ->
            LazyColumn {
                if (documents.isEmpty()) item { Text("Nenhum livro privado neste pacote. Exporte com --workspace no PC para incluir o acervo.") }
                items(documents, key = { it.text("id") }) { item ->
                    ListItem(headlineContent = { Text(item.text("title")) }, supportingContent = { Text("${item.number("pages")} páginas · ${item.text("language")}") }, modifier = Modifier.clickable { document = item; pageIndex = 0 })
                }
            }
        } else {
            TextButton(onClick = { document = null }) { Text("Voltar à estante") }
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                TextButton(enabled = pageIndex > 0, onClick = { pageIndex-- }) { Text("Anterior") }
                Text("${pageIndex + 1}/${current.number("pages")}", modifier = Modifier.padding(top = 14.dp))
                TextButton(enabled = pageIndex + 1 < current.number("pages"), onClick = { pageIndex++ }) { Text("Próxima") }
            }
            Load(current.text("id") to pageIndex, { repository.page(current.text("id"), pageIndex) }) { page ->
                if (page == null) Text("Esta página não tem texto exportado.")
                else Column(Modifier.verticalScroll(rememberScrollState())) {
                    TextButton(onClick = { selected = page }) { Text("Abrir página e original") }
                    SelectionContainer { Text(page.text("text").ifBlank { "Página sem texto extraído. Consulte o PDF original, se incluído." }) }
                }
            }
        }
    }
    selected?.let { PageDialog(repository, it) { selected = null } }
}

@Composable
fun PageDialog(repository: MobileRepository, page: Row, close: () -> Unit) {
    var index by remember { mutableIntStateOf(page.number("page_index")) }
    var pdfMode by remember { mutableStateOf(false) }
    val pdf = remember(page.text("checksum")) { repository.pdf(page.text("checksum")) }
    AlertDialog(onDismissRequest = close, title = { Text("${page.text("source_title")} · p. ${index + 1}") }, confirmButton = { TextButton(onClick = close) { Text("Fechar") } }, text = {
        Column(Modifier.heightIn(max = 600.dp).verticalScroll(rememberScrollState())) {
            if (pdf != null) TextButton(onClick = { pdfMode = !pdfMode }) { Text(if (pdfMode) "Ler texto extraído" else "Ver PDF original") }
            else Text("PDF não incluído neste pacote; o texto e a proveniência permanecem disponíveis.", style = MaterialTheme.typography.labelSmall)
            if (pdfMode && pdf != null) Load(pdf.absolutePath to index, {
                ParcelFileDescriptor.open(pdf, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                    PdfRenderer(descriptor).use { renderer ->
                        require(index in 0 until renderer.pageCount)
                        renderer.openPage(index).use { original ->
                            val width = 1000
                            val height = (width.toLong() * original.height / original.width).toInt().coerceIn(1, 2400)
                            Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
                                bitmap.eraseColor(android.graphics.Color.WHITE)
                                original.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            }
                        }
                    }
                }
            }) { bitmap -> Image(bitmap.asImageBitmap(), "Página ${index + 1} do PDF", Modifier.fillMaxWidth()) }
            else Load(page.text("document_id") to index, { repository.page(page.text("document_id"), index) }) { loaded ->
                val full = loaded?.text("text").orEmpty()
                val start = if (index == page.number("page_index")) page.number("start_offset").coerceIn(0, full.length) else 0
                val end = if (index == page.number("page_index")) page.number("end_offset").coerceIn(start, full.length) else 0
                val highlight = MaterialTheme.colorScheme.primaryContainer
                SelectionContainer { Text(buildAnnotatedString {
                    append(full.substring(0, start))
                    withStyle(SpanStyle(background = highlight)) { append(full.substring(start, end)) }
                    append(full.substring(end))
                }) }
            }
            Text("Página física do arquivo. O número editorial pode ser diferente.", style = MaterialTheme.typography.labelSmall)
        }
    })
}

fun traceLabel(kind: String): String = when (kind) {
    "snapshot" -> "Estado registrado"; "registered" -> "Ligação registrada"; "decision" -> "Decisão de publicação"
    "proposal-changed" -> "Ligação alterada"; "removed" -> "Ligação removida"; else -> kind
}

@Composable
fun TraceScreen(repository: MobileRepository) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("Rastro", "Histórico das ligações incluídas no pacote. Até 100 eventos recentes; cada comentário abre seu histórico específico.")
        Load("trace", repository::recentTrace) { events -> LazyColumn {
            if (events.isEmpty()) item { Text("Nenhum evento exportado neste pacote.") }
            items(events, key = { it.text("id") }) { event ->
                ListItem(headlineContent = { Text(event.text("title")) }, supportingContent = {
                    Text("${event.text("source_title")}\n${traceLabel(event.text("event_kind"))} · ${event.text("occurred_at")}\n${event.text("rationale")}")
                })
            }
        } }
    }
}
