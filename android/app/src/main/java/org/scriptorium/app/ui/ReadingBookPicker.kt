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
            AdditionalReading(work, "work", if (work.text("id") == "work:gospel-thomas-coptic") setOf("Não canônico", "Apócrifo", "Esotérico") else setOf("Fontes antigas"))
        } + repository.ancientReadingSections().map { AdditionalReading(it, "section", setOf("Não canônico", "Apócrifo", "Esotérico")) } + repository.documents().mapNotNull { row ->
            val name = normalizedReading(row.text("title"))
            val tags = buildSet {
                if (listOf("hammadi", "gnosti", "apocrif", "apocryph", "pseudepig", "naocanonic").any(name::contains)) add("Não canônico")
                if (listOf("apocrif", "apocryph", "pseudepig").any(name::contains)) add("Apócrifo")
                if (listOf("esoter", "hermet", "hammadi", "gnosti").any(name::contains)) add("Esotérico")
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
            if (filter in listOf("Apócrifo", "Não canônico")) Text("Inclui deuterocanônicos; o cânon varia por tradição.", Modifier.padding(horizontal = 16.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            val visible = books.filter { repository.navigation.bookMatches(it.text("book_id"), filter) && (group == null || repository.navigation.group(it.text("book_id")) == group) && normalizedReading(it.text("title")).contains(normalizedReading(query)) }
            val additional = extras.filter { (filter == "Todos" || filter in it.tags) && normalizedReading(it.row.text("title")).contains(normalizedReading(query)) }
            Text("$filter · ${visible.size} livros e ${additional.size} fontes instaladas", Modifier.padding(horizontal = 16.dp), style = MaterialTheme.typography.labelSmall)
            if (filter in listOf("Não canônico", "Apócrifo", "Esotérico")) Text("Categorias sobrepostas, não coleções exclusivas: uma fonte pode ser apócrifa e gnóstica. O cânon depende da tradição.", Modifier.padding(horizontal = 16.dp), style = MaterialTheme.typography.bodySmall)
            LazyColumn(contentPadding = PaddingValues(start = 16.dp, top = 8.dp, end = 16.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                visible.groupBy { repository.navigation.group(it.text("book_id")) }.forEach { (name, rows) ->
                    item { Text(name, Modifier.padding(top = 12.dp), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary) }
                    items(rows, key = { "bible:${it.text("id")}" }) { row -> BookTile(row.text("title"), "${row.number("chapters")} capítulos", row.text("book_id")) { chooseBook(row.text("id")) } }
                }
                if (additional.isNotEmpty()) item {
                    Heading("Outros textos do acervo", "Textos não canônicos e fontes históricas permanecem distintos da edição bíblica. Os rótulos não definem o cânon de todas as tradições.")
                }
                items(additional, key = { "${it.kind}:${it.row.text("id")}" }) { extra ->
                    BookTile(extra.row.text("title"), when (extra.kind) { "document" -> "Volume privado · ${extra.row.number("pages")} páginas"; "section" -> "Texto no volume instalado · p. ${extra.row.number("page_index") + 1}"; else -> "${extra.row.text("unit_count")} unidades · fonte antiga" }, "source:${extra.kind}") {
                        if (extra.kind == "work") primary(extra.row)
                        else if (extra.kind == "section") page(extra.row)
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
private fun BookTile(title: String, detail: String, bookId: String = "", open: () -> Unit) {
    Surface(onClick = open, color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.small, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            BookEmblem(bookId)
            Column(Modifier.weight(1f)) {
                Text(title, fontFamily = FontFamily.Serif, fontSize = 19.sp)
                Text(detail, Modifier.padding(top = 3.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            }
            Text("›", color = MaterialTheme.colorScheme.primary, fontSize = 24.sp)
        }
    }
}

/** Engraved monochrome manuscript emblems. No emoji fonts or downloaded artwork. */
@Composable
private fun BookEmblem(bookId: String) {
    val ink = MaterialTheme.colorScheme.primary
    androidx.compose.foundation.Canvas(Modifier.size(40.dp).clearAndSetSemantics { }) {
        val stroke = androidx.compose.ui.graphics.drawscope.Stroke(1.15.dp.toPx())
        fun point(x: Float, y: Float) = androidx.compose.ui.geometry.Offset(size.width * x, size.height * y)
        fun line(x: Float, y: Float, xx: Float, yy: Float) = drawLine(ink, point(x, y), point(xx, yy), 1.15.dp.toPx())
        fun path(vararg points: Pair<Float, Float>) {
            val shape = androidx.compose.ui.graphics.Path()
            points.forEachIndexed { index, p -> if (index == 0) shape.moveTo(size.width * p.first, size.height * p.second) else shape.lineTo(size.width * p.first, size.height * p.second) }
            drawPath(shape, ink, style = stroke)
        }
        // A restrained folio frame ties all books to the same library.
        drawRoundRect(ink.copy(alpha = 0.4f), point(.08f, .05f), androidx.compose.ui.geometry.Size(size.width * .84f, size.height * .9f), androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()), style = stroke)
        line(.19f, .05f, .19f, .95f)
        when (bookId) {
            "genesis" -> { drawCircle(ink, size.width * .16f, point(.55f,.5f), style = stroke); line(.55f,.21f,.55f,.29f); line(.55f,.71f,.55f,.79f); line(.27f,.5f,.34f,.5f); line(.76f,.5f,.83f,.5f) }
            "exodus", "jonah" -> repeat(3) { i -> val y=.37f+i*.14f; path(.30f to y,.42f to y-.05f,.55f to y,.68f to y-.05f,.81f to y) }
            "leviticus", "deuteronomy", "ezra", "nehemiah", "hebrews" -> { path(.29f to .4f,.55f to .24f,.81f to .4f,.29f to .4f); repeat(3) { line(.35f+it*.2f,.45f,.35f+it*.2f,.71f) }; line(.28f,.77f,.82f,.77f) }
            "numbers", "joshua", "acts" -> { path(.28f to .72f,.5f to .3f,.82f to .72f,.28f to .72f); line(.5f,.3f,.5f,.72f) }
            "judges", "job" -> { line(.55f,.25f,.55f,.77f); line(.31f,.38f,.79f,.38f); path(.31f to .39f,.24f to .58f,.4f to .58f,.31f to .39f); path(.79f to .39f,.71f to .58f,.87f to .58f,.79f to .39f); line(.4f,.77f,.7f,.77f) }
            "ruth", "proverbs", "wisdom", "sirach" -> { line(.55f,.24f,.55f,.79f); repeat(3) { val y=.35f+it*.14f; line(.55f,y,.36f,y-.1f); line(.55f,y,.74f,y-.1f) } }
            "1-samuel", "2-samuel", "1-kings", "2-kings", "1-chronicles", "2-chronicles", "esther", "judith", "1-maccabees", "2-maccabees" -> { path(.3f to .4f,.39f to .55f,.55f to .3f,.7f to .55f,.8f to .4f,.75f to .72f,.35f to .72f,.3f to .4f); line(.36f,.79f,.74f,.79f) }
            "psalms", "song-of-songs", "lamentations" -> { path(.33f to .3f,.36f to .65f,.55f to .77f,.74f to .65f,.77f to .3f); line(.33f,.3f,.77f,.3f); repeat(3) { line(.45f+it*.1f,.34f,.45f+it*.1f,.65f) } }
            "ecclesiastes" -> { path(.34f to .26f,.76f to .26f,.34f to .75f,.76f to .75f,.34f to .26f); line(.29f,.21f,.81f,.21f); line(.29f,.8f,.81f,.8f) }
            "matthew", "mark", "luke", "john" -> { line(.55f,.23f,.55f,.79f); line(.34f,.4f,.77f,.4f) }
            "daniel", "revelation" -> { path(.55f to .22f,.65f to .42f,.83f to .5f,.65f to .59f,.55f to .79f,.45f to .59f,.27f to .5f,.45f to .42f,.55f to .22f); drawCircle(ink,size.width*.05f,point(.55f,.5f),style=stroke) }
            "isaiah", "jeremiah", "ezekiel", "hosea", "joel", "amos", "obadiah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi", "baruch" -> {
                path(.36f to .27f,.73f to .27f,.73f to .73f,.36f to .73f,.36f to .27f)
                line(.45f,.41f,.66f,.41f); line(.45f,.52f,.66f,.52f); line(.45f,.63f,.59f,.63f)
                drawCircle(ink,size.width*.055f,point(.36f,.27f),style=stroke); drawCircle(ink,size.width*.055f,point(.73f,.73f),style=stroke)
            }
            else -> { path(.3f to .34f,.8f to .34f,.8f to .7f,.3f to .7f,.3f to .34f); path(.3f to .34f,.55f to .55f,.8f to .34f); line(.3f,.7f,.45f,.55f); line(.8f,.7f,.65f,.55f) }
        }
    }
}
