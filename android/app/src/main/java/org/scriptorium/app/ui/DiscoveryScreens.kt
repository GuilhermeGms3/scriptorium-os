package org.scriptorium.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*

@Composable
fun SearchScreen(repository: MobileRepository, open: (Passage) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var submitted by rememberSaveable { mutableStateOf("") }
    val editions = remember { repository.editions() }
    var edition by remember { mutableStateOf(editions.first()) }
    var editionMenu by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<Row?>(null) }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Heading("Busca no acervo", "Texto bíblico e páginas dos livros instalados. Consulta local por índice, sem percorrer os livros em memória.")
        OutlinedTextField(query, { query = it.take(240) }, label = { Text("O que deseja encontrar?") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Box {
            TextButton(onClick = { editionMenu = true }) { Text(edition.title) }
            DropdownMenu(expanded = editionMenu, onDismissRequest = { editionMenu = false }) {
                editions.forEach { item -> DropdownMenuItem(text = { Text(item.title) }, onClick = { edition = item; editionMenu = false }) }
            }
        }
        Button(onClick = { submitted = query.trim() }, enabled = query.trim().length >= 2) { Text("Pesquisar") }
        if (submitted.isNotBlank()) Load(submitted to edition, { repository.search(submitted, edition) }) { results ->
            LazyColumn {
                item { Text("${results.size} resultados · até 40 passagens e 40 páginas por consulta", style = MaterialTheme.typography.labelSmall) }
                if (results.isEmpty()) item { Text("Nenhum resultado neste pacote.", Modifier.padding(16.dp)) }
                items(results) { result ->
                    ListItem(headlineContent = { Text(result.title) }, supportingContent = { Text(result.text) }, modifier = Modifier.clickable {
                        result.passage?.let(open)
                        result.page?.let { selected = it }
                    })
                }
            }
        }
    }
    selected?.let { PageDialog(repository, it) { selected = null } }
}

@Composable
fun KnowledgeScreen(repository: MobileRepository) {
    var selected by remember { mutableStateOf<Row?>(null) }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("Teologia", "Árvore do acervo instalado. Doutrina, tradição, método e posição permanecem categorias distintas.")
        Load("ontology", repository::ontology) { entities ->
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (entities.isEmpty()) item { Text("Este pacote não inclui a ontologia. Exporte também knowledge.sqlite3 no PC.") }
                entities.groupBy { it.text("ontology_kind") }.forEach { (kind, group) ->
                    item { Text("│  ${ontologyLabel(kind)}", color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 16.dp)) }
                    items(group, key = { it.text("id") }) { entity ->
                        Row(Modifier.fillMaxWidth().clickable { selected = entity }.padding(12.dp)) {
                            Text("├─  ", color = MaterialTheme.colorScheme.primary)
                            Column { Text(entity.text("canonical_name")); Text(entity.text("description"), style = MaterialTheme.typography.bodySmall) }
                        }
                    }
                }
            }
        }
    }
    selected?.let { entity -> AlertDialog(onDismissRequest = { selected = null }, title = { Text(entity.text("canonical_name")) }, confirmButton = { TextButton(onClick = { selected = null }) { Text("Fechar") } }, text = {
        Column {
            Text(entity.text("description"))
            Load(entity.text("id"), { repository.ontologyRelations(entity.text("id")) }) { relations ->
                if (relations.isEmpty()) Text("Sem relações explícitas exportadas para esta entidade.", Modifier.padding(top = 16.dp))
                relations.forEach { Text("${it.text("from_title")} → ${it.text("relation_type")} → ${it.text("to_title")}", Modifier.padding(vertical = 8.dp)) }
            }
        }
    }) }
}

private fun ontologyLabel(kind: String): String = when (kind) {
    "theological-topic" -> "Temas"; "doctrine" -> "Doutrinas"; "tradition" -> "Tradições"
    "school" -> "Escolas"; "method" -> "Métodos"; "epistemic-stance" -> "Posturas epistemológicas"
    "interpretive-framework" -> "Sistemas interpretativos"; "position" -> "Posições"; "theory" -> "Teorias"
    else -> kind
}
