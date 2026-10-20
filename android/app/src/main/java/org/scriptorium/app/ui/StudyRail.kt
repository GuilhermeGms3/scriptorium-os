package org.scriptorium.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextOverflow

@Composable
fun StudyRail(titles: List<String>, selected: Int, label: String, enabled: (Int) -> Boolean = { true }, completed: (Int) -> Boolean = { false }, choose: (Int) -> Unit) {
    val list = rememberLazyListState()
    LaunchedEffect(selected) { if (titles.isNotEmpty()) list.animateScrollToItem((selected - 1).coerceAtLeast(0)) }
    Column {
        Text("$label · ${selected + 1} de ${titles.size}", Modifier.padding(horizontal = 4.dp, vertical = 8.dp), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
        LazyRow(state = list, horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(vertical = 4.dp)) {
            itemsIndexed(titles) { index, title ->
                Surface(
                    color = if (selected == index) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, if (selected == index) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)),
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.width(176.dp).heightIn(min = 88.dp).clickable(enabled = enabled(index), role = Role.Button) { choose(index) }.semantics { this.selected = selected == index; stateDescription = when { !enabled(index) -> "Conclua o módulo anterior"; completed(index) -> "Concluído"; else -> "Disponível" } }) {
                    Column(Modifier.padding(12.dp)) {
                        Text("${if (completed(index)) "✓ " else ""}${(index + 1).toString().padStart(2, '0')}${if (!enabled(index)) " · Bloqueado" else ""}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        Text(title, Modifier.padding(top = 4.dp), style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}
