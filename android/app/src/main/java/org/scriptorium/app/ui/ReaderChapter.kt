package org.scriptorium.app.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.distinctUntilChanged
import org.scriptorium.app.data.*

@Composable
fun ReaderChapter(repository: MobileRepository, personal: PersonalRepository, current: Passage, explanations: Boolean,
                  toggle: (Boolean) -> Unit, preferences: ReadingPreferences, open: (Passage) -> Unit,
                  source: (Row) -> Unit, note: (String) -> Unit, bookmark: (Row) -> Unit, original: () -> Unit) {
    var category by rememberSaveable { mutableStateOf<String?>(null) }
    var document by rememberSaveable { mutableStateOf<String?>(null) }
    var filters by rememberSaveable { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            TextButton(onClick = { filters = !filters }) { Text("Filtrar comentários ${if (category != null || document != null) "●" else "▾"}") }
            Spacer(Modifier.weight(1f))
            Switch(explanations, toggle, modifier = Modifier.semanticsLabel("Mostrar comentários"))
        }
        Load(current.copy(verse = null, verseEnd = null), {
            repository.verses(current) to (repository.books(current.edition).find { it.text("id") == current.workId }?.number("chapters") ?: current.chapter)
        }) { (verses, lastChapter) ->
            val comments by produceState<Result<Pair<List<Row>, Map<String, List<Row>>>>?>(null, current.edition.id, current.workId, current.chapter) {
                value = try { Result.success(withContext(Dispatchers.IO) { repository.comments(current) to repository.chapterTargets(current) }) }
                catch (cancelled: kotlinx.coroutines.CancellationException) { throw cancelled }
                catch (failure: Exception) { Result.failure(failure) }
            }
            val all = comments?.getOrNull()?.first.orEmpty()
            val targets = comments?.getOrNull()?.second.orEmpty()
            if (filters) CommentFilters(all, category, document, { category = it }, { document = it })
            val filtered = if (!explanations) emptyList() else all.filter { (category == null || category in it.commentCategories()) && (document == null || it.text("document_id") == document) }
            val list = rememberLazyListState()
            LaunchedEffect(current, verses) {
                val index = verses.indexOfFirst { current.verse != null && current.verse in it.number("verse_start")..it.number("verse_end").coerceAtLeast(it.number("verse_start")) }
                list.scrollToItem(if (index < 0) 0 else index + 1)
            }
            LaunchedEffect(current, verses, list) {
                snapshotFlow { list.firstVisibleItemIndex }.distinctUntilChanged().collect { index ->
                    verses.getOrNull(index - 1)?.let { preferences.savePassage(current.copy(verse = it.number("verse_start"), verseEnd = null)) }
                }
            }
            val contextual = filtered.filter { comment -> targets[comment.text("id")].orEmpty().any { it["verse_start"] == null } }
            var contextExpanded by rememberSaveable(current) { mutableStateOf(false) }
            LazyColumn(state = list, contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(22.dp)) {
                item(key = "chapter-heading") {
                    Heading("${current.title} ${current.chapter}")
                    var studyContext by rememberSaveable(current) { mutableStateOf(false) }
                    TextButton(onClick = { studyContext = !studyContext }) { Text(if (studyContext) "Recolher estudo do capítulo" else "Contexto e estudo do capítulo ▾") }
                    if (studyContext) ChapterContext(repository, personal, current)
                    if (explanations && comments == null) Text("Carregando comentários… A escritura já está disponível.", style = MaterialTheme.typography.labelSmall)
                    comments?.exceptionOrNull()?.let { Text("Comentários indisponíveis nesta abertura. O texto permanece disponível.", style = MaterialTheme.typography.labelSmall) }
                    if (contextual.isNotEmpty()) {
                        TextButton(onClick = { contextExpanded = !contextExpanded }) { Text("Contexto do livro/capítulo · ${contextual.size} ${if (contextExpanded) "▴" else "▾"}") }
                        if (contextExpanded) contextual.forEach { CommentPreview(it, personal, source) }
                    }
                    if (explanations && all.isNotEmpty() && filtered.isEmpty()) Text("Nenhum comentário corresponde aos filtros. Limpe-os em Filtrar comentários.", style = MaterialTheme.typography.bodySmall)
                }
                items(verses, key = { it.text("id") }) { verse ->
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        val verseNumber = verse.number("verse_start")
                        val lastVerse = verse.number("verse_end").coerceAtLeast(verseNumber)
                        val highlighted = current.verse != null && verseNumber <= (current.verseEnd ?: current.verse) && lastVerse >= current.verse
                        Surface(color = if (highlighted) MaterialTheme.colorScheme.primaryContainer else Color.Transparent, shape = MaterialTheme.shapes.small) {
                            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Surface(color = Color(0xFF725033), contentColor = Color.White, shape = MaterialTheme.shapes.small) {
                                    Box(Modifier.sizeIn(minWidth = 38.dp, minHeight = 38.dp).padding(6.dp), contentAlignment = androidx.compose.ui.Alignment.Center) {
                                        Text(if (lastVerse > verseNumber) "$verseNumber–$lastVerse" else "$verseNumber", style = MaterialTheme.typography.labelLarge)
                                    }
                                }
                                SelectionContainer(Modifier.weight(1f)) { Text(verse.text("surface_text"), fontFamily = FontFamily.Serif, fontSize = 23.sp, lineHeight = 36.sp, color = MaterialTheme.colorScheme.onSurface) }
                            }
                        }
                        LazyRow {
                            item { TextButton(onClick = original) { Text("Idioma") } }
                            item { TextButton(onClick = { note(verse.text("id")) }) { Text("Anotar") } }
                            item { TextButton(onClick = { bookmark(verse) }) { Text("Favoritar") } }
                        }
                        val linked = filtered.filter { comment -> targets[comment.text("id")].orEmpty().any { target ->
                            target.text("scheme_id") == current.scheme && target.text("work_id") == current.workId && target.text("book_id") == current.bookId &&
                                target.number("chapter") == current.chapter && target["verse_start"] != null && verseNumber in target.number("verse_start")..target.number("verse_end").coerceAtLeast(target.number("verse_start"))
                        } }
                        var more by rememberSaveable(current, verse.text("id")) { mutableStateOf(false) }
                        (if (more) linked else linked.take(2)).forEach { comment -> key(comment.text("id")) { CommentPreview(comment, personal, source) } }
                        if (linked.size > 2) TextButton(onClick = { more = !more }) { Text(if (more) "Mostrar só duas prévias" else "Mais ${linked.size - 2} comentários") }
                        HorizontalDivider(Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
                    }
                }
                item(key = "chapter-navigation") {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        TextButton(enabled = current.chapter > 1, onClick = { open(current.copy(chapter = current.chapter - 1, verse = null, verseEnd = null)) }) { Text("Anterior") }
                        TextButton(enabled = current.chapter < lastChapter, onClick = { open(current.copy(chapter = current.chapter + 1, verse = null, verseEnd = null)) }) { Text("Próximo") }
                    }
                }
            }
        }
    }
}

@Composable
private fun CommentPreview(comment: Row, personal: PersonalRepository, source: (Row) -> Unit) {
    var expanded by rememberSaveable(comment.text("id")) { mutableStateOf(false) }
    Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.small, modifier = Modifier.padding(start = 12.dp, top = 6.dp)) {
        Column(Modifier.animateContentSize().padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Text(comment.text("source_title"), Modifier.weight(1f), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                TextButton(onClick = { expanded = !expanded }) { Text(if (expanded) "Recolher ▴" else "Expandir ▾") }
            }
            Text(comment.commentCategories().joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            TextButton(onClick = { source(comment) }) { Text("Fonte completa, página e contexto ↗") }
            Column(Modifier.fillMaxWidth().clickable(onClickLabel = if (expanded) "Recolher comentário" else "Expandir comentário") { expanded = !expanded }) {
                Text(comment.text("body"), Modifier.padding(top = 8.dp), fontFamily = FontFamily.SansSerif, fontSize = 15.sp, lineHeight = 24.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = if (expanded) Int.MAX_VALUE else 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
            }
            if (expanded) {
                Text(if (comment.text("mode") == "source-excerpt") "Trecho da fonte" else "Síntese contextual assistida", style = MaterialTheme.typography.labelSmall)
                Text(reviewLabel(comment.text("review_status")), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                if (comment.text("mode") == "source-excerpt") TranslationBlock(comment.text("body"), comment.text("source_language"), personal)
            }
        }
    }
}

@Composable
private fun CommentFilters(comments: List<Row>, category: String?, document: String?, chooseCategory: (String?) -> Unit, chooseDocument: (String?) -> Unit) {
    Column(Modifier.padding(horizontal = 16.dp)) {
        Text("Assunto · conforme a classificação da fonte", style = MaterialTheme.typography.labelSmall)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            item { FilterChip(category == null, { chooseCategory(null) }, label = { Text("Todos") }) }
            items(comments.flatMap { it.commentCategories() }.distinct().sorted()) { name -> FilterChip(category == name, { chooseCategory(if (category == name) null else name) }, label = { Text(name) }) }
        }
        var menu by remember { mutableStateOf(false) }
        Box {
            TextButton(onClick = { menu = true }) { Text("Fonte: ${comments.find { it.text("document_id") == document }?.text("source_title") ?: if (document == null) "todas" else "selecionada"} ▾") }
            DropdownMenu(menu, { menu = false }) {
                DropdownMenuItem(text = { Text("Todas as fontes") }, onClick = { chooseDocument(null); menu = false })
                comments.distinctBy { it.text("document_id") }.forEach { row -> DropdownMenuItem(text = { Text(row.text("source_title")) }, onClick = { chooseDocument(row.text("document_id")); menu = false }) }
            }
        }
        if (category != null || document != null) TextButton(onClick = { chooseCategory(null); chooseDocument(null) }) { Text("Limpar filtros") }
    }
}

private fun Modifier.semanticsLabel(label: String): Modifier = this.then(Modifier.semantics { contentDescription = label })
