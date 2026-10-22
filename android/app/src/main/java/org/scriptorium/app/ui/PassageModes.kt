package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.data.*

@Composable
fun PassageMode(repository: MobileRepository, personal: PersonalRepository, passage: Passage, mode: String) {
    val appearance = LocalReadingAppearance.current
    if (mode == "Comparação") Load(passage, { repository.parallel(passage) }) { editions ->
        val verses = editions.flatMap { it.second.map { unit -> unit.number("verse_start") } }.distinct().sorted()
        val list = rememberLazyListState()
        LaunchedEffect(passage) { list.scrollToItem((verses.indexOf(passage.verse).takeIf { it >= 0 } ?: -1) + 1) }
        LazyColumn(state = list, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text("Edições em paralelo · ${passage.title} ${passage.chapter}", style = MaterialTheme.typography.labelLarge) }
            items(verses) { verse -> Column {
                Text("${passage.title} ${passage.chapter}:$verse", style = MaterialTheme.typography.titleMedium)
                editions.forEach { (edition, units) ->
                    val aligned = units.filter { unit -> verse in unit.number("verse_start")..(unit["verse_end"]?.toIntOrNull() ?: unit.number("verse_start")) }
                    Text(edition.title, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 10.dp))
                    Text(if (aligned.isEmpty()) "Sem alinhamento explícito disponível" else aligned.joinToString("\n") { it.text("surface_text") }, fontFamily = appearance.fontFamily, fontSize = appearance.size.coerceAtMost(24).sp, lineHeight = (appearance.size * 1.45f).sp)
                }
            } }
        }
    } else Load(passage to mode, { repository.originalEditions(passage).map { it to repository.verses(passage.copy(edition = it)) } to repository.verses(passage).associateBy { it.text("verse_start") } }) { (originals, translated) ->
        if (originals.isEmpty()) Text("Nenhuma edição original com este endereço explícito está instalada.", Modifier.padding(24.dp))
        else {
        val list = rememberLazyListState()
        LaunchedEffect(passage, mode) {
            val index = originals.first().second.indexOfFirst { passage.verse != null && passage.verse in it.number("verse_start")..it.number("verse_end").coerceAtLeast(it.number("verse_start")) }
            list.scrollToItem(if (index >= 0) index + if (mode == "Interlinear") 3 else 2 else 0)
        }
        LazyColumn(state = list, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { Text("Toque uma palavra para consultar o léxico.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary) }
            originals.forEach { (edition, units) ->
                item { Text(edition.title, color = MaterialTheme.colorScheme.primary) }
                if (mode == "Interlinear") item { Text("Português e original são relacionados por unidade textual; não há alinhamento lexical português↔original quando a fonte não o fornece.", style = MaterialTheme.typography.bodySmall) }
                items(units, key = { it.text("id") }) { unit -> Column {
                    Text(unit.text("display_address"), style = MaterialTheme.typography.labelSmall)
                    if (mode == "Interlinear") Text(translated[unit.text("verse_start")]?.text("surface_text").orEmpty(), fontFamily = appearance.fontFamily, fontSize = appearance.size.coerceAtMost(24).sp, lineHeight = (appearance.size * 1.45f).sp)
                    OriginalTokens(repository, personal, edition, unit, mode == "Interlinear")
                } }
            }
        }
        }
    }
}
