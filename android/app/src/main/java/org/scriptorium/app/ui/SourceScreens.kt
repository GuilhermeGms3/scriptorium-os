package org.scriptorium.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.data.*

@Composable
fun SourceDialog(repository: MobileRepository, personal: PersonalRepository, comment: Row, close: () -> Unit) {
    var note by remember { mutableStateOf(false) }
    var libraryPage by remember { mutableStateOf<Row?>(null) }
    var showTrace by remember { mutableStateOf(false) }
    val appearance = LocalReadingAppearance.current
    val accent = sourceAccent(comment)
    val details by produceState<Result<Pair<List<Row>, List<Row>>>?>(null, comment.text("id")) {
        value = try { Result.success(kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { repository.evidence(comment.text("id")) to repository.trace(comment.text("id")) }) }
        catch (cancelled: kotlinx.coroutines.CancellationException) { throw cancelled }
        catch (failure: Exception) { Result.failure(failure) }
    }
    val evidence = details?.getOrNull()?.first.orEmpty()
    val trace = details?.getOrNull()?.second.orEmpty()
    AlertDialog(onDismissRequest = close, confirmButton = { TextButton(onClick = close) { Text("Fechar") } }, title = {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(comment.text("source_title"), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = accent)
            TextButton(enabled = evidence.isNotEmpty(), onClick = { libraryPage = evidence.first() }) { Text("Biblioteca ↗", style = MaterialTheme.typography.labelMedium) }
        }
    }, text = {
        Column(Modifier.heightIn(max = 560.dp).verticalScroll(rememberScrollState())) {
            if (details == null) LinearProgressIndicator(Modifier.fillMaxWidth())
            details?.exceptionOrNull()?.let { Text("Não foi possível carregar as páginas desta fonte.", color = MaterialTheme.colorScheme.error) }
            if (details?.isSuccess == true && evidence.isEmpty()) Text("Sem página de origem disponível neste pacote.", style = MaterialTheme.typography.bodySmall)
            TranslationBlock(comment.text("body"), if (comment.text("mode") == "source-excerpt") comment.text("source_language") else "und", personal)
            SelectionContainer { Text(readingParagraphs(comment.text("body")), style = MaterialTheme.typography.bodyLarge,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Serif, fontSize = (appearance.size * 0.8f).coerceIn(16f, 19f).sp,
                lineHeight = (appearance.size * 1.2f).coerceIn(24f, 29f).sp, letterSpacing = 0.sp) }
            Text(comment.commentLabel(), Modifier.padding(top = 12.dp), style = MaterialTheme.typography.labelSmall, color = accent)
            Heading("Sobre esta leitura")
            Text(comment.text("rationale"))
            Text("Revisão: ${reviewLabel(comment.text("review_status"))}", Modifier.padding(vertical = 8.dp), style = MaterialTheme.typography.bodySmall)
            evidence.forEach { page ->
                Load(page.text("id"), { repository.outline(page.text("document_id")).filter { page.number("page_index") in it.number("page_start")..it.number("page_end") }.lastOrNull() }) { section ->
                    section?.let { Text(it.text("title"), style = MaterialTheme.typography.titleSmall, color = accent) }
                }
                val text = page.text("text")
                val start = page.number("start_offset").coerceIn(0, text.length)
                val end = page.number("end_offset").coerceIn(start, text.length)
                Text("Página ${page.number("page_index") + 1}", Modifier.padding(top = 16.dp, bottom = 8.dp), style = MaterialTheme.typography.labelLarge, color = accent)
                SelectionContainer { Text(readingParagraphs(text.substring(start, end)), fontFamily = androidx.compose.ui.text.font.FontFamily.Serif, fontSize = 16.sp, lineHeight = 25.sp, letterSpacing = 0.sp) }
            }
            TextButton(onClick = { showTrace = !showTrace }) { Text("Rastro da ligação ${if (showTrace) "▴" else "▾"}") }
            if (showTrace) {
                if (trace.isEmpty()) Text("Sem eventos históricos exportados para esta ligação.")
                trace.forEach { event -> Text("${event.text("occurred_at")} · ${traceLabel(event.text("event_kind"))}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(vertical = 4.dp)) }
            }
            Button(onClick = { note = true }, modifier = Modifier.padding(top = 16.dp)) { Text("Criar nota sobre esta fonte") }
        }
    })
    if (note) NoteEditor(personal, null, comment.text("id"), onClose = { note = false })
    libraryPage?.let { PageDialog(repository, it, personal) { libraryPage = null } }
}

@Composable
fun LibraryScreen(repository: MobileRepository, personal: PersonalRepository, requested: StudyReading? = null) {
    val appearance = LocalReadingAppearance.current
    var document by remember(requested?.id) { mutableStateOf<Row?>(requested?.page?.let { page -> mapOf("id" to page.text("document_id"), "title" to page.text("source_title"), "pages" to page.text("document_pages"), "checksum" to page.text("checksum")) }) }
    var pageIndex by rememberSaveable(requested?.id) { mutableIntStateOf(requested?.page?.number("page_index") ?: 0) }
    var selected by remember { mutableStateOf<Row?>(null) }
    var collection by rememberSaveable { mutableStateOf("Meus livros") }
    var filter by rememberSaveable { mutableStateOf("") }
    var primary by remember(requested?.id) { mutableStateOf(requested?.work) }
    val current = document
    BackHandler(document != null) { document = null }
    primary?.let { PrimaryReader(repository, personal, it) { primary = null }; return }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Heading(current?.text("title") ?: "Biblioteca", if (current == null) "Livros do pacote instalado. Texto extraído e PDF original são identificados separadamente." else "Biblioteca · página ${pageIndex + 1} de ${current.number("pages")}")
        if (current == null) {
            androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(listOf("Meus livros", "Fontes primárias", "Nag Hammadi", "Referências")) { name -> FilterChip(collection == name, { collection = name }, label = { Text(name) }) }
            }
            OutlinedTextField(filter, { filter = it.take(200) }, label = { Text("Filtrar títulos") }, modifier = Modifier.fillMaxWidth())
            if (collection == "Fontes primárias") {
                Load("primary-works", repository::primaryWorks) { works -> LazyColumn {
                    items(works.filter { it["chapters"].isNullOrEmpty() && it.text("title").contains(filter, true) }) { work -> ListItem(headlineContent = { Text(work.text("title")) }, supportingContent = { Text("${work.text("edition_title")} · ${work.text("unit_count")} unidades") }, modifier = Modifier.clickable { primary = work }) }
                } }; return@Column
            }
            if (collection == "Nag Hammadi") {
                Load("nag-hammadi", { repository.catalogItem("nag-hammadi") to repository.documents().filter { it.text("title").contains("hammadi", true) || it.text("title").contains("gnósti", true) } }) { (catalog, volumes) -> LazyColumn {
                    item { Text("Volumes integrais privados", Modifier.padding(vertical = 16.dp)) }
                    items(volumes) { volume -> TextButton(onClick = { document = volume; pageIndex = 0 }) { Text(volume.text("title")) } }
                    item { Text(catalog?.optString("rightsNote").orEmpty(), style = MaterialTheme.typography.bodySmall) }
                    items(catalog?.objects("texts").orEmpty().filter { it.toString().contains(filter, true) }) { entry ->
                        Text(entry.optString("portugueseTitle", entry.optString("title", entry.optString("id"))), Modifier.padding(vertical = 10.dp))
                    }
                    item { Text("O catálogo não equivale a uma tradução instalada. Abra os volumes privados acima para ler os textos disponíveis.") }
                } }; return@Column
            }
            if (collection == "Referências") {
                Load("bibliography", { repository.bibliography() + personal.references() }) { references -> LazyColumn {
                    items(references.filter { it.text("title").contains(filter, true) }) { reference -> ListItem(headlineContent = { Text(reference.text("title")) }, supportingContent = { Text("Registro bibliográfico · não significa texto integral instalado") }) }
                } }; return@Column
            }
        }
        if (current == null) Load("documents", repository::documents) { documents ->
            LazyColumn {
                if (documents.isEmpty()) item { Text("Nenhum livro privado neste pacote. Exporte com --workspace no PC para incluir o acervo.") }
                itemsIndexed(documents.filter { it.text("title").contains(filter, true) }, key = { _, it -> it.text("id") }) { index, item ->
                    Row(Modifier.fillMaxWidth().revealSection(index).clickable { document = item; pageIndex = 0 }.padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(Modifier.width(82.dp)) { PdfPagePreview(repository, item + mapOf("page_index" to "0", "source_title" to item.text("title")), 120.dp) }
                        Column(Modifier.weight(1f)) { Text(item.text("title")); Text("${item.number("pages")} páginas · ${item.text("language")}", style = MaterialTheme.typography.labelSmall) }
                    }
                }
            }
        } else {
            TextButton(onClick = { document = null }) { Text("Voltar à estante") }
            var showOutline by remember(current.text("id")) { mutableStateOf(false) }
            TextButton(onClick = { showOutline = !showOutline }) { Text("Índice extraído") }
            if (showOutline) Load(current.text("id"), { repository.outline(current.text("id")) }) { outline ->
                LazyColumn(Modifier.heightIn(max = 220.dp)) {
                    if (outline.isEmpty()) item { Text("Nenhum índice estruturado exportado para este livro.") }
                    items(outline) { node -> TextButton(onClick = { pageIndex = node.number("page_start"); showOutline = false }) { Text("${node.text("title")} · p. ${node.number("page_start") + 1}") } }
                }
            }
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                TextButton(enabled = pageIndex > 0, onClick = { pageIndex-- }) { Text("Anterior") }
                Text("${pageIndex + 1}/${current.number("pages")}", modifier = Modifier.padding(top = 14.dp))
                TextButton(enabled = pageIndex + 1 < current.number("pages"), onClick = { pageIndex++ }) { Text("Próxima") }
            }
            var jump by remember(current.text("id")) { mutableStateOf("") }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(jump, { jump = it.filter(Char::isDigit).take(5) }, label = { Text("Página física") }, modifier = Modifier.weight(1f), singleLine = true)
                TextButton(enabled = (jump.toIntOrNull() ?: 0) in 1..current.number("pages"), onClick = { pageIndex = jump.toInt() - 1; jump = "" }) { Text("Ir") }
            }
            Load(current.text("id") to pageIndex, { repository.page(current.text("id"), pageIndex) }) { page ->
                if (page == null) Text("Esta página não tem texto exportado.")
                else Column(Modifier.verticalScroll(rememberScrollState())) {
                    TextButton(onClick = { selected = page }) { Text("Abrir página e original") }
                    TranslationBlock(page.text("text"), page.text("language"), personal)
                    AudioTextActions("${current.text("title")} · p. ${pageIndex + 1}", page.text("text"), page.text("language"), org.json.JSONObject().put("kind", "document").put("documentId", current.text("id")).put("pageId", page.text("id")).put("pageIndex", pageIndex).put("checksum", page.text("checksum")))
                    val full = page.text("text").ifBlank { "Página sem texto extraído. Consulte o PDF original, se incluído." }
                    val target = requested?.page?.takeIf { it.number("page_index") == pageIndex && it.text("document_id") == current.text("id") }
                    val start = target?.number("start_offset") ?: 0
                    val end = target?.number("end_offset") ?: 0
                    val highlight = MaterialTheme.colorScheme.primaryContainer
                    SelectionContainer { Text(buildAnnotatedString {
                        if (start >= 0 && end > start && end <= full.length) {
                            append(full.substring(0, start))
                            withStyle(SpanStyle(background = highlight)) { append(full.substring(start, end)) }
                            append(full.substring(end))
                        } else append(full)
                    }, fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.55f).sp) }
                }
            }
        }
    }
    selected?.let { PageDialog(repository, it, personal) { selected = null } }
}

@Composable
fun PageDialog(repository: MobileRepository, page: Row, personal: PersonalRepository? = null, startWithPdf: Boolean = false, close: () -> Unit) {
    val appearance = LocalReadingAppearance.current
    var index by remember { mutableIntStateOf(page.number("page_index")) }
    var pdfMode by remember { mutableStateOf(startWithPdf) }
    var note by remember { mutableStateOf(false) }
    val pdf = remember(page.text("checksum")) { repository.pdf(page.text("checksum")) }
    AlertDialog(onDismissRequest = close, title = { Text("${page.text("source_title")} · p. ${index + 1}") }, confirmButton = { TextButton(onClick = close) { Text("Fechar") } }, text = {
        Column(Modifier.heightIn(max = 600.dp).verticalScroll(rememberScrollState())) {
            if (pdf != null) TextButton(onClick = { pdfMode = !pdfMode }) { Text(if (pdfMode) "Ler texto extraído" else "Ver PDF original") }
            else Text("PDF não incluído neste pacote; o texto e a proveniência permanecem disponíveis.", style = MaterialTheme.typography.labelSmall)
            Row {
                TextButton(enabled = index > 0, onClick = { index-- }) { Text("Anterior") }
                TextButton(enabled = index + 1 < page.number("document_pages"), onClick = { index++ }) { Text("Próxima") }
            }
            if (pdfMode && pdf != null) PdfPagePreview(repository, page + ("page_index" to index.toString()), 440.dp, true)
            else Load(page.text("document_id") to index, { repository.page(page.text("document_id"), index) }) { loaded ->
                val full = loaded?.text("text").orEmpty()
                val start = if (index == page.number("page_index")) page.number("start_offset").coerceIn(0, full.length) else 0
                val end = if (index == page.number("page_index")) page.number("end_offset").coerceIn(start, full.length) else 0
                val highlight = MaterialTheme.colorScheme.primaryContainer
                if (personal != null && loaded != null) TranslationBlock(full, loaded.text("language"), personal)
                if (loaded != null) AudioTextActions("${page.text("source_title")} · p. ${index + 1}", full, loaded.text("language"), org.json.JSONObject().put("kind", "document").put("documentId", loaded.text("document_id")).put("pageId", loaded.text("id")).put("pageIndex", index).put("checksum", loaded.text("checksum")))
                SelectionContainer { Text(buildAnnotatedString {
                    append(full.substring(0, start))
                    withStyle(SpanStyle(background = highlight)) { append(full.substring(start, end)) }
                    append(full.substring(end))
                }, fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.55f).sp) }
            }
            Text("Página física do arquivo. O número editorial pode ser diferente.", style = MaterialTheme.typography.labelSmall)
            if (personal != null) TextButton(onClick = { note = true }) { Text("Criar nota sobre esta página") }
        }
    })
    if (note && personal != null) NoteEditor(personal, null, page.text("id")) { note = false }
}

fun traceLabel(kind: String): String = when (kind) {
    "snapshot" -> "Estado registrado"; "registered" -> "Ligação registrada"; "decision" -> "Decisão de publicação"
    "proposal-changed" -> "Ligação alterada"; "removed" -> "Ligação removida"; else -> kind
}

@Composable
fun TraceScreen(repository: MobileRepository, personal: PersonalRepository) {
    var query by rememberSaveable { mutableStateOf("") }
    var offset by rememberSaveable { mutableIntStateOf(0) }
    var selected by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("Rastro", "Histórico real das ligações publicadas no pacote, com fonte, evidência e método. Sem novas decisões editoriais no celular.")
        OutlinedTextField(query, { query = it.take(200); offset = 0 }, label = { Text("Filtrar fonte ou título") }, modifier = Modifier.fillMaxWidth())
        Load(query to offset, { repository.traceEvents(query, offset) }) { events -> LazyColumn {
            if (events.isEmpty()) item { Text("Nenhum evento exportado neste pacote.") }
            items(events, key = { it.text("id") }) { event ->
                ListItem(headlineContent = { Text(event.text("title")) }, supportingContent = {
                    Text("${event.text("source_title")}\n${traceLabel(event.text("event_kind"))} · ${event.text("occurred_at")}\n${event.text("rationale")}")
                }, modifier = Modifier.clickable { selected = event.text("comment_id") })
            }
            item { Row { TextButton(enabled = offset > 0, onClick = { offset = (offset - 50).coerceAtLeast(0) }) { Text("Anterior") }; TextButton(enabled = events.size == 50, onClick = { offset += 50 }) { Text("Próximos eventos") } } }
        } }
    }
    selected?.let { id -> Load(id, { repository.comment(id) }) { comment -> if (comment != null) SourceDialog(repository, personal, comment) { selected = null } } }
}
