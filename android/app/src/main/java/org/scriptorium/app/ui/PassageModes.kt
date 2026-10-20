package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*

@Composable
fun PassageMode(repository: MobileRepository, personal: PersonalRepository, passage: Passage, mode: String) {
    if (mode == "Comparação") Load(passage, { repository.parallel(passage) }) { editions ->
        LazyColumn(contentPadding = PaddingValues(start = 20.dp, top = 20.dp, end = 20.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Heading("Comparação", "Endereços explícitos do mesmo esquema de navegação. Ausência de correspondência não é preenchida por coincidência de números.") }
            val verses = editions.flatMap { it.second.map { unit -> unit.number("verse_start") } }.distinct().sorted()
            items(verses) { verse -> Column {
                Text("${passage.title} ${passage.chapter}:$verse", style = MaterialTheme.typography.titleMedium)
                editions.forEach { (edition, units) ->
                    val aligned = units.filter { unit -> verse in unit.number("verse_start")..(unit["verse_end"]?.toIntOrNull() ?: unit.number("verse_start")) }
                    Text(edition.title, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 10.dp))
                    Text(if (aligned.isEmpty()) "Sem alinhamento explícito disponível" else aligned.joinToString("\n") { it.text("surface_text") })
                }
            } }
        }
    } else Load(passage to mode, { repository.originalEditions(passage).map { it to repository.verses(passage.copy(edition = it)) } to repository.verses(passage).associateBy { it.text("verse_start") } }) { (originals, translated) ->
        if (originals.isEmpty()) Text("Nenhuma edição original com este endereço explícito está instalada.", Modifier.padding(24.dp))
        else LazyColumn(contentPadding = PaddingValues(start = 20.dp, top = 20.dp, end = 20.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { Heading(mode, "Selecione uma palavra para abrir o léxico, tradução, morfologia e ocorrências.") }
            originals.forEach { (edition, units) ->
                item { Text(edition.title, color = MaterialTheme.colorScheme.primary) }
                if (mode == "Interlinear") item { Text("Português e original são relacionados por unidade textual; não há alinhamento lexical português↔original quando a fonte não o fornece.", style = MaterialTheme.typography.bodySmall) }
                items(units, key = { it.text("id") }) { unit -> Column {
                    Text(unit.text("display_address"), style = MaterialTheme.typography.labelSmall)
                    if (mode == "Interlinear") Text(translated[unit.text("verse_start")]?.text("surface_text").orEmpty())
                    OriginalTokens(repository, personal, edition, unit, mode == "Interlinear")
                } }
            }
        }
    }
}
