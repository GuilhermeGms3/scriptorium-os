package org.scriptorium.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import org.scriptorium.app.data.*

/** Contextual support, not a second reading mode. The reader stays composed beneath this window. */
@Composable
fun PassagePanel(repository: MobileRepository, personal: PersonalRepository, passage: Passage,
                 explanations: Boolean, toggle: (Boolean) -> Unit, category: String?, document: String?,
                 chooseCategory: (String?) -> Unit, chooseDocument: (String?) -> Unit,
                 source: (Row) -> Unit, tool: (String) -> Unit, close: () -> Unit) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var entered by remember { mutableStateOf(false) }
    var newNote by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Row?>(null) }
    var revision by remember { mutableIntStateOf(0) }
    Dialog(onDismissRequest = close, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize()) {
            Spacer(Modifier.matchParentSize().clickable(onClickLabel = "Fechar painel", onClick = close))
            LaunchedEffect(Unit) { entered = true }
            AnimatedVisibility(entered, modifier = Modifier.align(Alignment.CenterEnd), enter = slideInHorizontally { it }) {
                Surface(Modifier.widthIn(max = 480.dp).fillMaxWidth().fillMaxHeight().semantics { paneTitle = "Painel da passagem" }) {
                    Column(Modifier.systemBarsPadding()) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("PAINEL DA PASSAGEM", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall)
                                Text("${passage.title} ${passage.chapter}${passage.verse?.let { ":$it" }.orEmpty()}", fontFamily = FontFamily.Serif, fontSize = 23.sp)
                            }
                            TextButton(onClick = close) { Text("Voltar ao texto") }
                        }
                        PrimaryScrollableTabRow(selectedTabIndex = tab, edgePadding = 12.dp) {
                            listOf("Visão geral", "Texto e língua", "Fontes", "Minhas notas").forEachIndexed { index, label ->
                                Tab(selected = tab == index, onClick = { tab = index }, text = { Text(label) })
                            }
                        }
                        Load(passage, {
                            val units = repository.verses(passage).filter { row -> passage.verse == null || row.number("verse_start") <= (passage.verseEnd ?: passage.verse) && row.number("verse_end").coerceAtLeast(row.number("verse_start")) >= passage.verse }
                            val comments = repository.comments(passage)
                            val targets = repository.chapterTargets(passage)
                            units to comments.filter { commentApplies(passage, targets[it.text("id")].orEmpty(), includeContext = true) }
                        }) { (units, comments) ->
                            when (tab) {
                                0 -> LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                    item { Text(passage.edition.title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary) }
                                    if (passage.verse != null) item { Text(units.joinToString("\n") { it.text("surface_text") }, fontFamily = LocalReadingAppearance.current.fontFamily, fontSize = LocalReadingAppearance.current.size.sp, lineHeight = (LocalReadingAppearance.current.size * 1.5f).sp) }
                                    item { Heading("Contexto e testemunhos"); ChapterContext(repository, personal, passage, initiallyExpanded = true) }
                                    item { TextButton(onClick = { tab = 2 }) { Text("Consultar as fontes desta passagem") } }
                                }
                                1 -> Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Heading("Texto e língua", "As ferramentas abrem sobre a mesma leitura. Ao voltar, a passagem continua no lugar.")
                                    listOf("Comparação", "Texto original", "Interlinear").forEach { label -> OutlinedButton(onClick = { tool(label) }, modifier = Modifier.fillMaxWidth()) { Text(label) } }
                                }
                                2 -> Column {
                                    Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text("Comentários na leitura", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                                        Switch(explanations, toggle)
                                    }
                                    CommentFilters(comments, category, document, chooseCategory, chooseDocument)
                                    val filtered = filterComments(comments, category, document)
                                    LazyColumn(contentPadding = PaddingValues(start = 8.dp, end = 20.dp, bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (filtered.isEmpty()) item { Text(if (comments.isEmpty()) "Nenhuma fonte ligada a este trecho no pacote instalado." else "Nenhuma fonte corresponde aos filtros selecionados.", Modifier.padding(16.dp)) }
                                        items(filtered, key = { it.text("id") }) { CommentPreview(it, personal, source) }
                                    }
                                }
                                3 -> Column(Modifier.padding(20.dp)) {
                                    Button(enabled = units.isNotEmpty(), onClick = { newNote = true }) { Text("Anotar esta passagem") }
                                    Text("Notas ligadas ao trecho ou às suas fontes neste aparelho.", Modifier.padding(vertical = 12.dp), style = MaterialTheme.typography.bodySmall)
                                    Load(passage to revision, { personal.notesForSources(units.map { it.text("id") } + comments.map { it.text("id") }) }) { notes ->
                                        LazyColumn {
                                            if (notes.isEmpty()) item { Text("Você ainda não tem notas ligadas a este trecho.") }
                                            items(notes, key = { it.text("id") }) { row -> ListItem(headlineContent = { Text(row.text("title")) }, supportingContent = { Text(row.text("body").take(160)) }, modifier = Modifier.clickable { editing = row }) }
                                        }
                                    }
                                }
                            }
                            if (newNote) NoteEditor(personal, null, units.firstOrNull()?.text("id")) { newNote = false; revision++ }
                        }
                    }
                }
            }
        }
        editing?.let { row -> NoteEditor(personal, row, row["source_id"]) { editing = null; revision++ } }
    }
}
