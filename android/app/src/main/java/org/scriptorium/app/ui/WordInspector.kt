package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.platform.LocalLayoutDirection
import org.scriptorium.app.content.Edition
import org.scriptorium.app.data.*

@Composable
fun WordInspector(repository: MobileRepository, personal: PersonalRepository, edition: Edition, token: Row, close: () -> Unit) {
    var tab by remember { mutableStateOf("Léxico") }
    AlertDialog(onDismissRequest = close, title = { Column { Text(token.text("surface_form"), fontSize = 28.sp); Text(token.text("transliteration"), style = MaterialTheme.typography.labelSmall) } }, confirmButton = { TextButton(onClick = close) { Text("Fechar") } }, text = {
        Column(Modifier.heightIn(max = 600.dp)) {
            androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(listOf("Léxico", "Morfologia", "Ocorrências", "Estatísticas", "Fonte")) { label -> FilterChip(tab == label, { tab = label }, label = { Text(label) }) }
            }
            when (tab) {
                "Léxico" -> Load(edition.id to token.text("id"), { repository.lexicalEntries(edition, token).map { it to repository.lexicalSenses(edition, it.text("id")) } }) { entries ->
                    LazyColumn {
                        if (entries.isEmpty()) item { Text("Não há verbete correspondente aos identificadores fornecidos por esta edição. Não se infere um significado apenas da raiz.") }
                        items(entries, key = { it.first.text("id") }) { (entry, senses) ->
                            Column(Modifier.padding(vertical = 12.dp)) {
                                Text("${entry.text("lemma")} · ${entry.text("transliteration")}", style = MaterialTheme.typography.titleMedium)
                                senses.forEach { sense ->
                                    Text(sense.text("gloss"), Modifier.padding(top = 8.dp))
                                    if (sense.text("definition").isNotBlank()) Text(sense.text("definition"))
                                    TranslationBlock(listOf(sense.text("gloss"), sense.text("definition")).filter(String::isNotBlank).joinToString("\n\n"), "en", personal)
                                }
                                Text(entry.text("source_title"), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
                "Morfologia" -> Column {
                    Heading("Forma e análise")
                    Text("Lema: ${token.text("lemma_text").ifBlank { token.text("lemma_id") }}")
                    val analysis = remember(token) { tokenMorphology(token.text("morphology")) }
                    Text(analysis.description)
                    if (analysis.code.isNotBlank()) Text("Código da fonte: ${analysis.code}", style = MaterialTheme.typography.labelSmall)
                    Text("Strong: ${token.text("strongs")}")
                    Text("O código é uma anotação linguística da fonte, não uma interpretação teológica.", Modifier.padding(top = 16.dp), style = MaterialTheme.typography.bodySmall)
                }
                "Ocorrências" -> Load(edition.id to token.text("id"), { repository.occurrences(edition, token) }) { rows -> LazyColumn {
                    item { Text("Até 200 ocorrências nesta edição; a contagem total está em Estatísticas.", style = MaterialTheme.typography.labelSmall) }
                    items(rows) { row -> Text("${row.text("display_address")} · ${row.text("surface_form")}", Modifier.padding(vertical = 8.dp)) }
                } }
                "Estatísticas" -> Load(edition.id to token.text("id"), { repository.lexicalStatistics(edition, token) }) { (distribution, neighbors) -> LazyColumn {
                    item { Heading("${distribution.sumOf { it.number("count") }} ocorrências", "Distribuição por livro") }
                    items(distribution) { Text("${it.text("title")}: ${it.text("count")}", Modifier.padding(vertical = 4.dp)) }
                    item { Heading("Palavras vizinhas", "Tokens imediatamente anteriores ou posteriores; associação não determina sentido.") }
                    items(neighbors) { Text("${it.text("surface_form")} · ${it.text("lemma_text")} — ${it.text("count")}", Modifier.padding(vertical = 4.dp)) }
                } }
                else -> Column { Text(edition.title); Text("Token: ${token.text("id")}"); Text("Idioma: ${token.text("language")}"); Text("A edição original, o corpus e os identificadores são preservados no pacote.", Modifier.padding(top = 12.dp)) }
            }
        }
    })
}

@Composable
fun OriginalTokens(repository: MobileRepository, personal: PersonalRepository, edition: Edition, unit: Row, interlinear: Boolean) {
    var selected by remember { mutableStateOf<Row?>(null) }
    Load(edition.id to unit.text("id"), { repository.tokens(edition, unit.text("id")) }) { tokens ->
        if (tokens.isEmpty()) Text(unit.text("surface_text"), fontSize = 22.sp)
        else CompositionLocalProvider(LocalLayoutDirection provides if (tokens.first().text("language") in listOf("he", "hbo", "arc")) LayoutDirection.Rtl else LayoutDirection.Ltr) {
          androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            tokens.forEach { token ->
                Surface(onClick = { selected = token }, color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.small) { Column(Modifier.widthIn(min = 60.dp, max = 144.dp).padding(8.dp), horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                    Text(token.text("surface_form"), fontSize = 23.sp, color = MaterialTheme.colorScheme.primary)
                    if (interlinear) {
                        Text(token.text("transliteration"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                        Text(token.text("lemma_text").ifBlank { "Lema não informado" }, style = MaterialTheme.typography.bodySmall)
                        val analysis = remember(token) { tokenMorphology(token.text("morphology")) }
                        Text(analysis.description, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                    }
                } }
            }
          }
        }
    }
    selected?.let { WordInspector(repository, personal, edition, it) { selected = null } }
}
