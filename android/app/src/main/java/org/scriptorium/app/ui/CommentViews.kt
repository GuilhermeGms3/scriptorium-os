package org.scriptorium.app.ui

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.data.*

@Composable
internal fun CommentPreview(comment: Row, personal: PersonalRepository, source: (Row) -> Unit) {
    var expanded by rememberSaveable(comment.text("id")) { mutableStateOf(false) }
    val accent = sourceAccent(comment)
    val appearance = LocalReadingAppearance.current
    Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, border = BorderStroke(1.dp, accent.copy(alpha = 0.25f)), shape = MaterialTheme.shapes.small,
        modifier = Modifier.fillMaxWidth().clickable(onClickLabel = "Abrir fonte ${comment.text("source_title")}") { source(comment) }) {
        Column(Modifier.animateContentSize().padding(start = 12.dp, end = 6.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(comment.text("source_title"), Modifier.weight(1f).padding(vertical = 12.dp), style = MaterialTheme.typography.labelLarge, color = accent)
                TextButton(onClick = { expanded = !expanded }, modifier = Modifier.semantics { contentDescription = "${if (expanded) "Recolher" else "Expandir"} comentário de ${comment.text("source_title")}" }) { Text(if (expanded) "Recolher ▴" else "Expandir ▾", style = MaterialTheme.typography.labelMedium) }
            }
            if (expanded) {
                Text(readingParagraphs(comment.text("body")), Modifier.padding(end = 6.dp, bottom = 12.dp), fontSize = (appearance.size * 0.77f).coerceIn(14f, 18f).sp,
                    lineHeight = (appearance.size * 1.18f).coerceAtLeast(23f).sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(listOf(comment.commentCategories().joinToString(" · "), if (comment.text("mode") == "source-excerpt") "Trecho da fonte" else "Síntese contextual assistida").joinToString(" · "),
                    Modifier.padding(bottom = 12.dp), style = MaterialTheme.typography.labelSmall, color = accent)
            }
        }
    }
}

@Composable
internal fun CommentToolbar(comments: List<Row>, count: Int, explanations: Boolean, toggle: (Boolean) -> Unit,
    category: String?, document: String?, chooseCategory: (String?) -> Unit, chooseDocument: (String?) -> Unit, filtersOpen: Boolean, toggleFilters: () -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Spacer(Modifier.weight(1f))
            if (!explanations) TextButton(onClick = { toggle(true) }) { Text("Mostrar") }
            TextButton(onClick = toggleFilters) { Text("Filtrar${if (category != null || document != null) " ●" else " ▾"}") }
            Spacer(Modifier.weight(1f))
        }
        if (filtersOpen) CommentFilters(comments, category, document, chooseCategory, chooseDocument)
    }
}

@Composable
internal fun CommentFilters(comments: List<Row>, category: String?, document: String?, chooseCategory: (String?) -> Unit, chooseDocument: (String?) -> Unit) {
    Column(Modifier.padding(horizontal = 12.dp)) {
        Text("Assunto e fonte", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
        val categories = comments.flatMap { it.commentCategories() }.distinct().sorted()
        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            item { FilterChip(category == null, { chooseCategory(null) }, label = { Text("Todos") }) }
            if (categories.any { it in setOf("Exegese", "Comentário bíblico") }) item { FilterChip(category == "Exegese e comentário bíblico", { chooseCategory("Exegese e comentário bíblico") }, label = { Text("Exegese e comentário bíblico") }) }
            items(categories) { name -> FilterChip(category == name, { chooseCategory(if (category == name) null else name) }, label = { Text(if (name == "Catequese e confissão") "Catecismo e confissão" else name) }) }
        }
        var menu by remember { mutableStateOf(false) }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) {
                TextButton(onClick = { menu = true }) { Text("Fonte: ${comments.find { it.text("document_id") == document }?.text("source_title") ?: if (document == null) "todas" else "selecionada"} ▾", maxLines = 2) }
                DropdownMenu(menu, { menu = false }) {
                    DropdownMenuItem(text = { Text("Todas as fontes") }, onClick = { chooseDocument(null); menu = false })
                    comments.distinctBy { it.text("document_id") }.forEach { row -> DropdownMenuItem(text = { Text(row.text("source_title")) }, onClick = { chooseDocument(row.text("document_id")); menu = false }) }
                }
            }
            if (category != null || document != null) TextButton(onClick = { chooseCategory(null); chooseDocument(null) }) { Text("Limpar filtros") }
        }
    }
}

@Composable
internal fun CommentsDock(groups: List<CommentGroup>, activeVerse: Int?, reference: String, personal: PersonalRepository, source: (Row) -> Unit,
    all: List<Row>, count: Int, explanations: Boolean, toggle: (Boolean) -> Unit, category: String?, document: String?, chooseCategory: (String?) -> Unit, chooseDocument: (String?) -> Unit,
    filtersOpen: Boolean, toggleFilters: () -> Unit, expanded: Boolean, toggleExpanded: () -> Unit, modifier: Modifier = Modifier) {
    val list = rememberLazyListState()
    LaunchedEffect(activeVerse, groups.map { it.verse }) {
        val index = groups.indexOfFirst { it.verse != null && it.verse!! >= (activeVerse ?: 1) }
        if (index >= 0) list.scrollToItem(groups.take(index).sumOf { it.comments.size + 1 })
    }
    Surface(modifier, color = MaterialTheme.colorScheme.surface, shadowElevation = 6.dp) {
        Column {
            HorizontalDivider(color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.6f))
            Box(Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 8.dp)) {
                Text("$reference${activeVerse?.let { ":$it" }.orEmpty()}", Modifier.align(Alignment.CenterStart).widthIn(max = 120.dp), maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
                if (expanded) TextButton(onClick = toggleFilters, modifier = Modifier.align(Alignment.Center)) { Text("Filtrar${if (category != null || document != null) " ●" else " ▾"}", style = MaterialTheme.typography.labelMedium) }
                TextButton(onClick = toggleExpanded, modifier = Modifier.align(Alignment.CenterEnd), contentPadding = PaddingValues(horizontal = 4.dp)) { Text(if (expanded) "Recolher painel ▾" else "Comentários ▴", style = MaterialTheme.typography.labelMedium) }
            }
            if (expanded) {
                if (!explanations) TextButton(onClick = { toggle(true) }) { Text("Mostrar comentários") }
                if (filtersOpen) CommentFilters(all, category, document, chooseCategory, chooseDocument)
                LazyColumn(state = list, modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (groups.isEmpty()) item { Text(if (!explanations) "Ative Mostrar para consultar as fontes." else "Nenhum comentário corresponde a este capítulo e aos filtros.", style = MaterialTheme.typography.bodySmall) }
                    groups.forEach { group ->
                        item(key = "heading:${group.verse}") { Text(group.verse?.let { "Versículo $it" } ?: "Contexto do capítulo", Modifier.padding(top = 8.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary) }
                        items(group.comments, key = { "${group.verse}:${it.text("id")}" }) { CommentPreview(it, personal, source) }
                    }
                }
            }
        }
    }
}
