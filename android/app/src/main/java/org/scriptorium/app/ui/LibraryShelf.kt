package org.scriptorium.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.MobileRepository
import org.scriptorium.app.data.Row
import org.scriptorium.app.data.text
import java.text.Collator
import java.util.Locale

@Composable
internal fun LibraryShelf(repository: MobileRepository, books: List<Row>, filter: String,
                          modifier: Modifier = Modifier, open: (Row) -> Unit) {
    val titled = remember(books) {
        val collator = Collator.getInstance(Locale.forLanguageTag("pt-BR"))
        books.map { it to libraryBookTitle(it.text("title")) }
            .sortedWith { a, b -> collator.compare(a.second, b.second) }
    }
    val visible = remember(titled, filter) {
        titled.filter { (book, title) -> title.contains(filter, true) || book.text("title").contains(filter, true) }
    }
    if (visible.isEmpty()) {
        Text(if (books.isEmpty()) "Nenhum livro instalado nesta coleção." else "Nenhum título encontrado. Tente outro nome.",
            modifier.padding(vertical = 24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    BoxWithConstraints(modifier.fillMaxWidth()) {
        val columns = (maxWidth / 180.dp).toInt().coerceIn(2, 4)
        LazyVerticalGrid(GridCells.Fixed(columns), verticalArrangement = Arrangement.spacedBy(24.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp), contentPadding = PaddingValues(top = 20.dp, bottom = 28.dp)) {
            itemsIndexed(visible, key = { _, item -> item.first.text("id") + ":" + item.first.text("edition_id") }) { index, (book, title) ->
                Column(Modifier.fillMaxWidth().revealSection(index)
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
