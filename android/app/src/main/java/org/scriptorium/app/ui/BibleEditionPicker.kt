package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.scriptorium.app.content.Edition
import org.scriptorium.app.data.ReadingNavigation

@Composable
internal fun BibleEditionButton(edition: Edition, navigation: ReadingNavigation, choose: () -> Unit) {
    OutlinedButton(onClick = choose, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Tradução da Bíblia", style = MaterialTheme.typography.labelSmall)
                Text(navigation.editionTitle(edition.id, edition.title), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text("Trocar ▾", Modifier.padding(start = 12.dp))
        }
    }
}

@Composable
internal fun BibleEditionPicker(editions: List<Edition>, selected: Edition, navigation: ReadingNavigation,
                                close: () -> Unit, choose: (Edition) -> Unit) {
    AlertDialog(onDismissRequest = close, title = { Text("Trocar tradução da Bíblia") },
        confirmButton = { TextButton(onClick = close) { Text("Fechar") } }, text = {
            Column {
                Text("Traduções e textos originais instalados. Algumas edições possuem apenas parte da Bíblia.", style = MaterialTheme.typography.bodySmall)
                LazyColumn(Modifier.heightIn(max = 360.dp).selectableGroup()) {
                    items(editions, key = { it.id }) { edition ->
                        Row(Modifier.fillMaxWidth().selectable(selected = edition.id == selected.id,
                            role = Role.RadioButton, onClick = { choose(edition) }).padding(vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = edition.id == selected.id, onClick = null)
                            Text(navigation.editionTitle(edition.id, edition.title), Modifier.weight(1f).padding(start = 8.dp))
                        }
                    }
                }
            }
        })
}
