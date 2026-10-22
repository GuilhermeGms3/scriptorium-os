package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.scriptorium.app.content.Edition
import org.scriptorium.app.data.*

private data class AdditionalReading(val row: Row, val kind: String, val tags: Set<String>)

@Composable
fun ReadingBookPicker(repository: MobileRepository, edition: Edition, bookId: String?, chooseBook: (String?) -> Unit,
                      open: (Passage) -> Unit, primary: (Row) -> Unit, page: (Row) -> Unit) {
    var filter by rememberSaveable { mutableStateOf("Bíblia") }
    var group by rememberSaveable { mutableStateOf<String?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    Load("reading-book-catalog", repository::readingBooks) { catalog ->
        val books = catalog.map { it.row }
        val extraResult by produceState<Result<List<AdditionalReading>>?>(null, filter != "Bíblia") {
            if (filter != "Bíblia") value = try { Result.success(withContext(Dispatchers.IO) {
            repository.primaryWorks().filter { it["chapters"].isNullOrEmpty() }.map { work ->
            AdditionalReading(work, "work", if (work.text("id") == "work:gospel-thomas-coptic") setOf("Não canônico", "Apócrifo") else setOf("Fontes antigas"))
        } + repository.documents().mapNotNull { row ->
            val name = normalizedReading(row.text("title"))
            val tags = buildSet {
                if (listOf("hammadi", "gnosti", "apocrif", "naocanonic").any(name::contains)) add("Não canônico")
                if (name.contains("apocrif")) add("Apócrifo")
                if (listOf("esoter", "hermet").any(name::contains)) add("Esotérico")
            }
            if (tags.isEmpty()) null else AdditionalReading(row, "document", tags)
        }
            }) } catch (cancelled: kotlinx.coroutines.CancellationException) { throw cancelled } catch (failure: Exception) { Result.failure(failure) }
        }
        val extras = extraResult?.getOrNull().orEmpty()
        val selectedBook = catalog.find { it.row.text("id") == bookId }
        val chosen = selectedBook?.row
        val chosenEdition = selectedBook?.edition ?: edition
        if (chosen != null) {
            Column(Modifier.padding(horizontal = 16.dp)) {
                TextButton(onClick = { chooseBook(null) }) { Text("← Livros") }
                Heading(chosen.text("title"), "Escolha o capítulo para abrir a leitura.")
                LazyVerticalGrid(GridCells.Adaptive(64.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                    items((1..chosen.number("chapters")).toList()) { chapter ->
                        OutlinedButton(onClick = { open(Passage(chosenEdition, chosen.text("id"), chosen.text("book_id"), chosen.text("title"), chapter, chosen.text("scheme"))) }, modifier = Modifier.padding(4.dp), contentPadding = PaddingValues(4.dp)) { Text(chapter.toString()) }
                    }
                }
            }
        } else Column {
            Box(Modifier.padding(horizontal = 16.dp)) { Heading("Escrituras e textos antigos") }
            OutlinedTextField(query, { query = it.take(120) }, label = { Text("Encontrar livro ou texto") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(listOf("Todos", "Bíblia", "Não canônico", "Apócrifo", "Esotérico", "Fontes antigas")) { name -> FilterChip(filter == name, { filter = name; group = null }, label = { Text(name) }) }
            }
            if (filter in listOf("Todos", "Bíblia")) LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                item { FilterChip(group == null, { group = null }, label = { Text("Todas as seções") }) }
                items(books.map { repository.navigation.group(it.text("book_id")) }.distinct()) { name -> FilterChip(group == name, { group = name }, label = { Text(name) }) }
            }
            val visible = books.filter { filter in listOf("Todos", "Bíblia") && (group == null || repository.navigation.group(it.text("book_id")) == group) && normalizedReading(it.text("title")).contains(normalizedReading(query)) }
            val additional = extras.filter { (filter == "Todos" || filter in it.tags) && normalizedReading(it.row.text("title")).contains(normalizedReading(query)) }
            LazyColumn(contentPadding = PaddingValues(start = 16.dp, top = 8.dp, end = 16.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                visible.groupBy { repository.navigation.group(it.text("book_id")) }.forEach { (name, rows) ->
                    item { Text(name, Modifier.padding(top = 12.dp), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary) }
                    items(rows, key = { "bible:${it.text("id")}" }) { row -> BookTile(row.text("title"), "${row.number("chapters")} capítulos", repository.navigation.symbol(row.text("book_id")), row.text("book_id")) { chooseBook(row.text("id")) } }
                }
                if (additional.isNotEmpty()) item {
                    Heading("Outros textos do acervo", "Textos não canônicos e fontes históricas permanecem distintos da edição bíblica. Os rótulos não definem o cânon de todas as tradições.")
                }
                items(additional, key = { "${it.kind}:${it.row.text("id")}" }) { extra ->
                    BookTile(extra.row.text("title"), if (extra.kind == "document") "Volume privado · ${extra.row.number("pages")} páginas" else "${extra.row.text("unit_count")} unidades · fonte antiga", if ("Apócrifo" in extra.tags) "☼" else "▤") {
                        if (extra.kind == "work") primary(extra.row)
                        else page(extra.row + mapOf("document_id" to extra.row.text("id"), "source_title" to extra.row.text("title"), "page_index" to "0", "document_pages" to extra.row.text("pages")))
                    }
                }
                if (filter != "Bíblia" && extraResult == null) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                if (filter != "Bíblia" && extraResult?.isFailure == true) item { Text("Não foi possível consultar os textos antigos. Abra novamente esta seleção para tentar de novo.") }
                if (visible.isEmpty() && additional.isEmpty() && (filter == "Bíblia" || extraResult?.isSuccess == true)) item { Text("Nenhum texto instalado corresponde a este filtro. O catálogo de Nag Hammadi continua em Biblioteca; uma entrada de catálogo não equivale ao texto integral.", Modifier.padding(vertical = 20.dp)) }
            }
        }
    }
}

@Composable
private fun BookTile(title: String, detail: String, symbol: String, bookId: String = "", open: () -> Unit) {
    Surface(onClick = open, color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.small, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            BookEmblem(bookId, symbol)
            Column(Modifier.weight(1f)) {
                Text(title, fontFamily = FontFamily.Serif, fontSize = 19.sp)
                Text(detail, Modifier.padding(top = 3.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            }
            Text("›", color = MaterialTheme.colorScheme.primary, fontSize = 24.sp)
        }
    }
}

/** Small local vector illustration; no image downloads or new book assets. */
@Composable
private fun BookEmblem(bookId: String, symbol: String) {
    val bronze = MaterialTheme.colorScheme.primary
    Box(Modifier.size(44.dp).clearAndSetSemantics { }, contentAlignment = Alignment.Center) {
        androidx.compose.foundation.Canvas(Modifier.fillMaxSize()) {
            val centre = androidx.compose.ui.geometry.Offset(size.width / 2, size.height / 2)
            drawCircle(bronze.copy(alpha = 0.1f))
            drawCircle(bronze.copy(alpha = 0.4f), radius = size.width * 0.44f, style = androidx.compose.ui.graphics.drawscope.Stroke(1.dp.toPx()))
            if (bookId == "genesis") {
                drawCircle(bronze, radius = size.width * 0.12f)
                repeat(8) { index ->
                    val angle = index * Math.PI / 4
                    val start = centre + androidx.compose.ui.geometry.Offset((kotlin.math.cos(angle) * size.width * 0.23).toFloat(), (kotlin.math.sin(angle) * size.height * 0.23).toFloat())
                    val end = centre + androidx.compose.ui.geometry.Offset((kotlin.math.cos(angle) * size.width * 0.34).toFloat(), (kotlin.math.sin(angle) * size.height * 0.34).toFloat())
                    drawLine(bronze, start, end, strokeWidth = 1.5.dp.toPx())
                }
            }
        }
        if (bookId != "genesis") Text(when (bookId) {
            "exodus" -> "🌊"
            "leviticus", "1-maccabees", "2-maccabees" -> "🔥"
            "numbers" -> "🏕"
            "deuteronomy", "ezra", "nehemiah" -> "📜"
            "joshua" -> "🏞"
            "judges" -> "⚖"
            "ruth" -> "🌾"
            "1-samuel", "2-samuel", "1-kings", "2-kings", "1-chronicles", "2-chronicles", "esther" -> "♛"
            "job" -> "🕯"
            "psalms" -> "♫"
            "proverbs", "wisdom", "sirach" -> "🦉"
            "ecclesiastes" -> "⌛"
            "song-of-songs" -> "🌹"
            "lamentations" -> "💧"
            "jonah" -> "🐟"
            "daniel", "revelation" -> "✦"
            "isaiah", "jeremiah", "ezekiel", "hosea", "joel", "amos", "obadiah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi", "baruch" -> "📯"
            "matthew", "mark", "luke", "john" -> "✝"
            "acts" -> "🕊"
            "romans", "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy", "titus", "philemon", "hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude" -> "✉"
            else -> symbol
        }, fontSize = 25.sp, color = bronze)
    }
}
