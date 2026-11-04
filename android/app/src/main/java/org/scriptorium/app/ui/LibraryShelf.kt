package org.scriptorium.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.MobileRepository
import org.scriptorium.app.data.Row
import org.scriptorium.app.data.text

@Composable
internal fun LibraryShelf(repository: MobileRepository, books: List<Row>, filter: String,
                          modifier: Modifier = Modifier, filters: LibraryFilters,
                          state: LazyGridState, changeFilters: (LibraryFilters) -> Unit, open: (Row) -> Unit) {
    val visible = remember(books, filter, filters) { filterLibrary(books, filter, filters) }
    var showFilters by remember { mutableStateOf(false) }
    Column(modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text("${visible.size} de ${books.size} livros", style = MaterialTheme.typography.labelLarge)
            TextButton(onClick = { showFilters = true }) { Text("Filtros${if (filters.count > 0) " (${filters.count})" else ""} · ${if (filters.descending) "Z–A" else "A–Z"}") }
        }
        if (filters.count > 0) {
            Text(listOf(filters.type, filters.subject, filters.language).filter { it.isNotEmpty() }.joinToString(" · "),
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = { changeFilters(LibraryFilters(descending = filters.descending)) }) { Text("Limpar filtros") }
        }
        if (visible.isEmpty()) Text(if (books.isEmpty()) "Nenhum livro instalado nesta coleção." else "Nenhum livro com esta combinação. Limpe os filtros ou tente outro título.",
            Modifier.padding(vertical = 24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
        BoxWithConstraints(Modifier.fillMaxWidth().weight(1f)) {
            val columns = (maxWidth / 180.dp).toInt().coerceIn(2, 4)
            LazyVerticalGrid(GridCells.Fixed(columns), state = state, verticalArrangement = Arrangement.spacedBy(24.dp),
                horizontalArrangement = Arrangement.spacedBy(20.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 28.dp)) {
                itemsIndexed(visible, key = { _, item -> item.first.text("id") + ":" + item.first.text("edition_id") }) { _, (book, title) ->
                    Column(Modifier.fillMaxWidth()
                        .clip(MaterialTheme.shapes.small)
                        .clickable(role = Role.Button, onClickLabel = "Abrir $title") { open(book) }
                        .semantics(mergeDescendants = true) {}, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Surface(Modifier.fillMaxWidth().aspectRatio(0.70f), shape = MaterialTheme.shapes.small,
                            color = MaterialTheme.colorScheme.surfaceContainerLow, shadowElevation = 2.dp) {
                            BookCover(repository, book)
                        }
                        Text(title, Modifier.fillMaxWidth(), style = MaterialTheme.typography.titleSmall,
                            maxLines = 3, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
    if (showFilters) AlertDialog(onDismissRequest = { showFilters = false }, title = { Text("Encontrar uma leitura") },
        confirmButton = { TextButton(onClick = { showFilters = false }) { Text("Ver ${visible.size} livros") } },
        dismissButton = { TextButton(onClick = { changeFilters(LibraryFilters()) }) { Text("Limpar tudo") } },
        text = { Column(Modifier.verticalScroll(rememberScrollState())) {
            Text("Tipo sugerido pelo título. Assunto indica leituras já vinculadas ao livro.", style = MaterialTheme.typography.bodySmall)
            LibraryFilterChoices("Tipo de obra", books.map(::libraryBookType).distinct().sorted(), filters.type) { changeFilters(filters.copy(type = it)) }
            LibraryFilterChoices("Assunto relacionado", books.flatMap(::librarySubjects).distinct().sorted(), filters.subject) { changeFilters(filters.copy(subject = it)) }
            LibraryFilterChoices("Idioma", books.map(::libraryLanguage).distinct().sorted(), filters.language) { changeFilters(filters.copy(language = it)) }
            Text("Ordenação", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 12.dp))
            Row {
                FilterChip(!filters.descending, { changeFilters(filters.copy(descending = false)) }, label = { Text("A–Z") })
                Spacer(Modifier.width(8.dp))
                FilterChip(filters.descending, { changeFilters(filters.copy(descending = true)) }, label = { Text("Z–A") })
            }
        } })
}

@Composable
private fun LibraryFilterChoices(title: String, options: List<String>, selected: String, select: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxWidth().padding(top = 12.dp)) {
        OutlinedButton(onClick = { expanded = true }, enabled = options.isNotEmpty(), modifier = Modifier.fillMaxWidth()) {
            Text("$title: ${if (options.isEmpty()) "Não disponível" else selected.ifEmpty { "Todos" }}")
        }
        DropdownMenu(expanded, { expanded = false }, modifier = Modifier.heightIn(max = 320.dp)) {
            DropdownMenuItem(text = { Text("Todos") }, onClick = { select(""); expanded = false })
            options.forEach { value -> DropdownMenuItem(text = { Text(value) }, onClick = { select(value); expanded = false }) }
        }
    }
}
