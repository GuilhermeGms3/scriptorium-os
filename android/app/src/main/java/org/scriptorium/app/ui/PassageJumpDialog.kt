package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.scriptorium.app.content.Edition
import org.scriptorium.app.data.*

@Composable
fun PassageJumpDialog(repository: MobileRepository, edition: Edition, onClose: () -> Unit, open: (Passage) -> Unit) {
    var query by remember { mutableStateOf("") }
    var book by remember { mutableStateOf<Row?>(null) }
    var chapter by remember { mutableStateOf<Int?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    fun submit() {
        if (busy) return
        busy = true; error = null
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) { repository.resolveReference(query, edition) }
                if (result != null) open(result) else error = "Referência não encontrada nesta edição. Use, por exemplo, Jo 3:16 ou Salmos 119:105."
            } catch (_: Exception) { error = "Não foi possível abrir a referência. Tente novamente." }
            finally { busy = false }
        }
    }
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxWidth().fillMaxHeight(0.92f).systemBarsPadding().imePadding(), shape = MaterialTheme.shapes.large) {
            Column(Modifier.padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Ir direto à passagem", style = MaterialTheme.typography.titleLarge)
                    TextButton(onClick = onClose) { Text("Fechar") }
                }
                OutlinedTextField(query, { query = it.take(100); error = null }, label = { Text("Livro capítulo:versículo") }, placeholder = { Text("Jo 3:16 · 1Co 13:4-7 · Sl 119") }, singleLine = true, enabled = !busy,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go), keyboardActions = KeyboardActions(onGo = { submit() }), modifier = Modifier.fillMaxWidth())
                Row { Button(enabled = query.isNotBlank() && !busy, onClick = ::submit) { Text(if (busy) "Abrindo…" else "Abrir referência") } }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                Text(edition.title, style = MaterialTheme.typography.labelSmall)
                val selectedBook = book
                val selectedChapter = chapter
                if (selectedBook == null) {
                    Text("Ou escolha o livro", Modifier.padding(vertical = 12.dp), style = MaterialTheme.typography.titleSmall)
                    Load(edition, { repository.books(edition) }) { books ->
                        LazyVerticalGrid(GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(books.filter { query.isBlank() || normalizedReading(it.text("title")).contains(normalizedReading(query)) }, key = { it.text("id") }) { row ->
                                OutlinedButton(onClick = { book = row; query = "" }) { Text(row.text("title")) }
                            }
                        }
                    }
                } else {
                    TextButton(onClick = { if (chapter != null) chapter = null else book = null }) { Text("← ${if (chapter != null) "Capítulos" else "Livros"}") }
                    Text("${selectedBook.text("title")}${selectedChapter?.let { " $it" }.orEmpty()}", style = MaterialTheme.typography.titleLarge)
                    if (selectedChapter == null) {
                        Text("Capítulo", Modifier.padding(vertical = 10.dp))
                        LazyVerticalGrid(GridCells.Adaptive(64.dp)) { items((1..selectedBook.number("chapters")).toList()) { number -> OutlinedButton(onClick = { chapter = number }, modifier = Modifier.padding(3.dp), contentPadding = PaddingValues(4.dp)) { Text(number.toString()) } } }
                    } else {
                        val passage = Passage(edition, selectedBook.text("id"), selectedBook.text("book_id"), selectedBook.text("title"), selectedChapter, selectedBook.text("scheme"))
                        TextButton(onClick = { open(passage) }) { Text("Abrir capítulo desde o início") }
                        Text("Versículo", Modifier.padding(vertical = 10.dp))
                        Load(passage, { repository.verses(passage) }) { verses ->
                            LazyVerticalGrid(GridCells.Adaptive(64.dp)) { items(verses, key = { it.text("id") }) { verse -> OutlinedButton(onClick = { open(passage.copy(verse = verse.number("verse_start"))) }, modifier = Modifier.padding(3.dp), contentPadding = PaddingValues(4.dp)) { Text(verse.text("verse_start")) } } }
                        }
                    }
                }
            }
        }
    }
}
