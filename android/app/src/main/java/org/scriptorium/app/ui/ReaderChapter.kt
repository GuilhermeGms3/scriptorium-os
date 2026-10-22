package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.platform.ViewConfiguration
import androidx.compose.foundation.lazy.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.distinctUntilChanged
import org.scriptorium.app.data.*

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ReaderChapter(repository: MobileRepository, personal: PersonalRepository, current: Passage, explanations: Boolean, toggle: (Boolean) -> Unit,
                  category: String?, document: String?, chooseCategory: (String?) -> Unit, chooseDocument: (String?) -> Unit, preferences: ReadingPreferences, open: (Passage) -> Unit,
                  source: (Row) -> Unit, note: (String) -> Unit, bookmark: (Row) -> Unit, original: () -> Unit, visible: (Row) -> Unit) {
    val appearance = LocalReadingAppearance.current
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val readerHeight = maxHeight
        Column(Modifier.fillMaxSize()) {
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
                val filtered = remember(all, explanations, category, document) { if (!explanations) emptyList() else filterComments(all, category, document) }
                val groups = remember(current, verses, filtered, targets) { commentGroups(current, verses, filtered, targets) }
                var activeVerse by rememberSaveable(current) { mutableStateOf(current.verse) }
                var filtersOpen by rememberSaveable { mutableStateOf(false) }
                var dockExpanded by rememberSaveable { mutableStateOf(true) }
                val list = rememberLazyListState()
                var positioned by rememberSaveable(current) { mutableStateOf(false) }
                LaunchedEffect(current, verses) {
                    if (positioned) return@LaunchedEffect
                    val index = verses.indexOfFirst { current.verse != null && current.verse in it.number("verse_start")..it.number("verse_end").coerceAtLeast(it.number("verse_start")) }
                    list.scrollToItem(if (index < 0) 0 else index + 1)
                    positioned = true
                }
                LaunchedEffect(current, verses, list) {
                    snapshotFlow {
                        val layout = list.layoutInfo
                        readingAnchor(layout.visibleItemsInfo.filter { it.key != "chapter-heading" && it.key != "chapter-navigation" }
                            .map { VisibleReadingItem(it.index, it.offset, it.size) }, layout.viewportStartOffset, layout.viewportEndOffset)
                    }.distinctUntilChanged().collect { index ->
                        verses.getOrNull((index ?: 0) - 1)?.let { activeVerse = it.number("verse_start"); preferences.savePassage(current.copy(verse = activeVerse, verseEnd = null)); visible(it) }
                    }
                }
                if (!appearance.dockedComments) CommentToolbar(all, filtered.size, explanations, toggle, category, document, chooseCategory, chooseDocument, filtersOpen, { filtersOpen = !filtersOpen })
                LazyColumn(state = list, modifier = Modifier.weight(1f), contentPadding = PaddingValues(start = 16.dp, top = 8.dp, end = 16.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    item(key = "chapter-heading") {
                        Heading("${current.title} ${current.chapter}")
                        if (explanations && comments == null) Text("Carregando comentários… A escritura já está disponível.", style = MaterialTheme.typography.labelSmall)
                        comments?.exceptionOrNull()?.let { Text("Comentários indisponíveis nesta abertura. O texto permanece disponível.", style = MaterialTheme.typography.labelSmall) }
                        if (!appearance.dockedComments) groups.find { it.verse == null }?.comments?.forEach { CommentPreview(it, personal, source) }
                        if (explanations && all.isNotEmpty() && filtered.isEmpty()) Text("Nenhum comentário corresponde aos filtros. Use Limpar filtros.", style = MaterialTheme.typography.bodySmall)
                    }
                    items(verses, key = { it.text("id") }) { verse ->
                        Column((if (verse.number("verse_start") <= 4) Modifier.revealSection(verse.number("verse_start")) else Modifier), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            val verseNumber = verse.number("verse_start")
                            val lastVerse = verse.number("verse_end").coerceAtLeast(verseNumber)
                            var actions by remember { mutableStateOf(false) }
                            val baseConfiguration = LocalViewConfiguration.current
                            val holdConfiguration = remember(baseConfiguration) { object : ViewConfiguration by baseConfiguration { override val longPressTimeoutMillis = 2000L } }
                            CompositionLocalProvider(LocalViewConfiguration provides holdConfiguration) {
                                Surface(color = Color.Transparent, shape = MaterialTheme.shapes.small,
                                    modifier = Modifier.combinedClickable(onClick = { activeVerse = verseNumber; visible(verse) }, onLongClickLabel = "Ações do versículo $verseNumber", onLongClick = { actions = true })) {
                                    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Surface(color = Color(0xFF725033), contentColor = Color.White, shape = MaterialTheme.shapes.small) {
                                            Box(Modifier.widthIn(min = 26.dp, max = 44.dp).heightIn(min = 26.dp).padding(horizontal = 4.dp, vertical = 3.dp), contentAlignment = androidx.compose.ui.Alignment.Center) {
                                                Text(if (lastVerse > verseNumber) "$verseNumber–$lastVerse" else "$verseNumber", style = MaterialTheme.typography.labelLarge)
                                            }
                                        }
                                        Text(verse.text("surface_text"), Modifier.weight(1f), fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.55f).sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                            }
                            if (actions) AlertDialog(onDismissRequest = { actions = false }, title = { Text("${current.title} ${current.chapter}:$verseNumber") }, confirmButton = { TextButton(onClick = { actions = false }) { Text("Fechar") } }, text = {
                                val context = androidx.compose.ui.platform.LocalContext.current
                                Column {
                                    TextButton(onClick = { actions = false; note(verse.text("id")) }) { Text("Anotar") }
                                    TextButton(onClick = { actions = false; bookmark(verse) }) { Text("Favoritar") }
                                    TextButton(onClick = { actions = false; activeVerse = verseNumber; visible(verse); original() }) { Text("Interlinear") }
                                    TextButton(onClick = { (context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager).setPrimaryClip(android.content.ClipData.newPlainText("${current.title} ${current.chapter}:$verseNumber", verse.text("surface_text"))); actions = false }) { Text("Copiar versículo") }
                                }
                            })
                            if (!appearance.dockedComments) {
                                val linked = groups.find { it.verse == verseNumber }?.comments.orEmpty()
                                var more by rememberSaveable(current, verse.text("id")) { mutableStateOf(false) }
                                (if (more) linked else linked.take(2)).forEach { comment -> key(comment.text("id")) { CommentPreview(comment, personal, source) } }
                                if (linked.size > 2) TextButton(onClick = { more = !more }) { Text(if (more) "Recolher outras fontes" else "Mais ${linked.size - 2} comentários") }
                            }
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
                if (appearance.dockedComments) CommentsDock(groups, activeVerse, "${current.title} ${current.chapter}", personal, source,
                    all, filtered.size, explanations, toggle, category, document, chooseCategory, chooseDocument,
                    filtersOpen, { filtersOpen = !filtersOpen }, dockExpanded, { dockExpanded = !dockExpanded },
                    Modifier.fillMaxWidth().height(if (dockExpanded) (readerHeight * 0.48f).coerceAtLeast(190.dp).coerceAtMost(readerHeight * 0.7f) else 52.dp))
            }
        }
    }
}
