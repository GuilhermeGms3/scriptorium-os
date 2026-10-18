package org.scriptorium.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.content.Edition
import org.scriptorium.app.data.*

@Composable
fun ReaderScreen(repository: MobileRepository, personal: PersonalRepository, requested: Passage?) {
    val editions = remember { repository.editions() }
    var edition by remember(requested) { mutableStateOf(requested?.edition ?: editions.first()) }
    var passage by remember(requested) { mutableStateOf(requested) }
    var book by remember { mutableStateOf<Row?>(null) }
    var explanations by remember { mutableStateOf(true) }
    var selected by remember { mutableStateOf<Row?>(null) }
    var tokenUnit by remember { mutableStateOf<String?>(null) }
    var editionMenu by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = { passage = null; book = null }) { Text(passage?.let { "${it.title} ${it.chapter} ▾" } ?: "Escolher livro") }
            Box {
                TextButton(onClick = { editionMenu = true }) { Text("Edição ▾") }
                DropdownMenu(expanded = editionMenu, onDismissRequest = { editionMenu = false }) {
                    editions.forEach { item -> DropdownMenuItem(text = { Text(item.title) }, onClick = {
                        edition = item; passage = null; book = null; editionMenu = false
                    }) }
                }
            }
        }
        Text(edition.title, Modifier.padding(horizontal = 20.dp), style = MaterialTheme.typography.labelSmall)
        val current = passage
        if (current == null) {
            Load(edition.id, { repository.books(edition) }) { books ->
                LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    val chosen = book
                    if (chosen == null) {
                        item { Heading("Escrituras", "Livros efetivamente presentes nesta edição.") }
                        items(books, key = { it.text("id") }) { row ->
                            ListItem(headlineContent = { Text(row.text("title"), fontFamily = FontFamily.Serif) },
                                supportingContent = { Text("${row.number("chapters")} capítulos") },
                                modifier = Modifier.clickable { book = row })
                        }
                    } else {
                        item { Heading(chosen.text("title")) }
                        items((1..chosen.number("chapters")).toList()) { chapter ->
                            TextButton(onClick = { passage = Passage(edition, chosen.text("id"), chosen.text("book_id"), chosen.text("title"), chapter, chosen.text("scheme")) }, modifier = Modifier.fillMaxWidth()) { Text("Capítulo $chapter") }
                        }
                    }
                }
            }
        } else {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Comentários")
                Switch(checked = explanations, onCheckedChange = { explanations = it })
            }
            Load(current, {
                repository.verses(current) to (repository.books(edition).find { it.text("id") == current.workId }?.number("chapters") ?: current.chapter)
            }) { (verses, lastChapter) ->
                // The toggle only hides presentation; it never mutates source visibility.
                Load(current to explanations, { if (explanations) repository.comments(current) else emptyList() }) { loaded ->
                    val comments = loaded
                    Load(current to comments.map { it.text("id") }, { repository.chapterTargets(current) }) { targets ->
                        var contextExpanded by rememberSaveable(current) { mutableStateOf(false) }
                        val contextual = comments.filter { comment -> targets[comment.text("id")].orEmpty().any { it["verse_start"] == null } }
                        LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            item { Heading("${current.title} ${current.chapter}") }
                            if (contextual.isNotEmpty()) item {
                                TextButton(onClick = { contextExpanded = !contextExpanded }) { Text("Contexto do livro/capítulo · ${contextual.size} ligações ${if (contextExpanded) "▴" else "▾"}") }
                                if (contextExpanded) contextual.forEach { comment ->
                                    ListItem(headlineContent = { Text(comment.text("title")) }, supportingContent = { Text(comment.text("source_title")) }, modifier = Modifier.clickable { selected = comment })
                                }
                            }
                            items(verses, key = { it.text("id") }) { verse ->
                                Column {
                                    SelectionContainer { Text("${verse.text("verse_start")}  ${verse.text("surface_text")}", fontFamily = FontFamily.Serif, fontSize = 21.sp, lineHeight = 33.sp) }
                                    TextButton(onClick = { tokenUnit = verse.text("id") }) { Text("Texto e língua") }
                                    val linked = comments.filter { comment ->
                                        targets[comment.text("id")].orEmpty().any { target ->
                                            target.text("scheme_id") == current.scheme && target.text("work_id") == current.workId &&
                                                target.text("book_id") == current.bookId &&
                                                target.number("chapter") == current.chapter && target["verse_start"] != null &&
                                                verse.number("verse_start") in target.number("verse_start")..target.number("verse_end")
                                        }
                                    }
                                    var expanded by rememberSaveable(current, verse.text("id")) { mutableStateOf(false) }
                                    (if (expanded) linked else linked.take(2)).forEach { comment ->
                                        Column(Modifier.fillMaxWidth().padding(start = 12.dp, top = 12.dp).clickable { selected = comment }) {
                                            Text(comment.text("source_title"), color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline, style = MaterialTheme.typography.labelLarge)
                                            Text(comment.commentLabel(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                                            Text(comment.text("body"), fontFamily = FontFamily.Serif, fontSize = 17.sp, lineHeight = 26.sp, modifier = Modifier.padding(top = 6.dp))
                                            Text(if (comment.text("mode") == "source-excerpt") "Trecho da fonte" else "Síntese contextual assistida", style = MaterialTheme.typography.labelSmall)
                                            Text(if (comment.text("review_status") == "accepted") "Aceito no acervo • abrir fonte e Rastro" else "Ligação automática • não revisada • abrir fonte e Rastro", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                                        }
                                    }
                                    if (linked.size > 2) TextButton(onClick = { expanded = !expanded }) { Text(if (expanded) "Recolher comentários" else "Ver os ${linked.size} comentários desta passagem") }
                                }
                            }
                            item {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    TextButton(enabled = current.chapter > 1, onClick = { passage = current.copy(chapter = current.chapter - 1) }) { Text("Anterior") }
                                    TextButton(enabled = current.chapter < lastChapter, onClick = { passage = current.copy(chapter = current.chapter + 1) }) { Text("Próximo") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    selected?.let { SourceDialog(repository, personal, it) { selected = null } }
    tokenUnit?.let { unit ->
        AlertDialog(onDismissRequest = { tokenUnit = null }, confirmButton = { TextButton(onClick = { tokenUnit = null }) { Text("Fechar") } }, title = { Text("Texto e língua") }, text = {
            Load(edition.id to unit, { repository.tokens(edition, unit) }) { tokens ->
                LazyColumn { if (tokens.isEmpty()) item { Text("Esta edição não contém tokens linguísticos. Selecione uma edição original incluída no pacote.") }
                    items(tokens) { token -> Column(Modifier.padding(vertical = 8.dp)) {
                        Text(token.text("surface_form"), fontSize = 24.sp)
                        Text(listOf(token.text("lemma_text"), token.text("lemma_id"), token.text("transliteration"), token.text("morphology")).filter(String::isNotBlank).joinToString(" · "))
                    } }
                }
            }
        })
    }
}
