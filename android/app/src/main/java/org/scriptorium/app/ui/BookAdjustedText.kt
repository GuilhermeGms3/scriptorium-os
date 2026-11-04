package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.scriptorium.app.data.*

@Composable
internal fun BookAdjustedText(page: Row, index: Int, target: Row?) {
    val appearance = LocalReadingAppearance.current
    val sections = remember(page) { libraryReadingSections(page.text("text")) }
    val list = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val active by remember { derivedStateOf {
        val layout = list.layoutInfo
        ((readingAnchor(layout.visibleItemsInfo.filter { it.index > 0 }.map { VisibleReadingItem(it.index, it.offset, it.size) }, layout.viewportStartOffset, layout.viewportEndOffset) ?: 1) - 1).coerceIn(0, (sections.size - 1).coerceAtLeast(0))
    } }
    Row(Modifier.fillMaxSize()) {
        ReadingSectionIndicators(sections.size, active, { "Parágrafo de leitura ${it + 1} · página ${index + 1}" }) { section ->
            scope.launch { if (appearance.motion) list.animateScrollToItem(section + 1) else list.scrollToItem(section + 1) }
        }
        LazyColumn(state = list, modifier = Modifier.weight(1f), contentPadding = PaddingValues(start = 8.dp, end = 20.dp, top = 22.dp, bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            item {
                Text("TEXTO AJUSTADO · PÁGINA ${index + 1}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                val start = target?.number("start_offset") ?: 0
                val end = target?.number("end_offset") ?: 0
                if (start >= 0 && end > start && end <= page.text("text").length) Surface(color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.padding(top = 16.dp)) {
                    Column(Modifier.padding(14.dp)) {
                        Text("Trecho indicado", style = MaterialTheme.typography.labelMedium)
                        SelectionContainer { Text(readingParagraphs(page.text("text").substring(start, end)), fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.6f).sp) }
                    }
                }
            }
            itemsIndexed(sections) { number, text ->
                Column {
                    Text("§ ${number + 1}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.8f), modifier = Modifier.padding(bottom = 6.dp))
                    SelectionContainer { Text(text, fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.65f).sp, letterSpacing = 0.sp) }
                }
            }
        }
    }
}
