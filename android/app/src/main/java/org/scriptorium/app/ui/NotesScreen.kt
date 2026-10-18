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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.scriptorium.app.data.*

@Composable
fun NotesScreen(personal: PersonalRepository) {
    var revision by remember { mutableIntStateOf(0) }
    var editing by remember { mutableStateOf<Row?>(null) }
    var new by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("Notas", "Pessoais e locais: atualizações do acervo não substituem suas anotações.")
        Button(onClick = { new = true }) { Text("Nova nota") }
        Load(revision, personal::list) { notes -> LazyColumn {
            if (notes.isEmpty()) item { Text("Suas notas aparecerão aqui.", Modifier.padding(vertical = 24.dp)) }
            items(notes, key = { it.text("id") }) { note ->
                ListItem(headlineContent = { Text(note.text("title")) }, supportingContent = { Text(note.text("body").take(160)) }, modifier = Modifier.clickable { editing = note })
            }
        } }
    }
    if (new || editing != null) NoteEditor(personal, editing, editing?.get("source_id"), onClose = { new = false; editing = null; revision++ })
}

@Composable
fun NoteEditor(personal: PersonalRepository, existing: Row?, sourceId: String?, onClose: () -> Unit) {
    var title by rememberSaveable(existing?.get("id")) { mutableStateOf(existing?.text("title").orEmpty()) }
    var body by rememberSaveable(existing?.get("id")) { mutableStateOf(existing?.text("body").orEmpty()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmDiscard by remember { mutableStateOf(false) }
    val dirty = title != existing?.text("title").orEmpty() || body != existing?.text("body").orEmpty()
    val scope = rememberCoroutineScope()
    fun close() { if (!busy) { if (dirty) confirmDiscard = true else onClose() } }
    Dialog(onDismissRequest = ::close, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().systemBarsPadding().imePadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Heading(if (existing == null) "Nova nota" else "Editar nota")
                OutlinedTextField(title, { title = it.take(300) }, label = { Text("Título") }, modifier = Modifier.fillMaxWidth(), enabled = !busy)
                OutlinedTextField(body, { body = it.take(200_000) }, label = { Text("Sua anotação") }, modifier = Modifier.weight(1f).fillMaxWidth(), enabled = !busy)
                if (sourceId != null) Text("Origem preservada: ${sourceId.take(90)}", style = MaterialTheme.typography.labelSmall)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    TextButton(onClick = ::close, enabled = !busy) { Text("Fechar") }
                    Button(enabled = !busy && title.isNotBlank(), onClick = {
                        busy = true
                        scope.launch {
                            try {
                                withContext(Dispatchers.IO) { personal.save(existing?.get("id"), title, body, sourceId) }
                                onClose()
                            } catch (failure: Exception) { error = failure.message }
                            finally { busy = false }
                        }
                    }) { Text(if (busy) "Salvando…" else "Salvar") }
                }
            }
        }
    }
    if (confirmDiscard) AlertDialog(onDismissRequest = { confirmDiscard = false }, title = { Text("Descartar alterações?") }, text = { Text("As alterações ainda não salvas serão perdidas.") },
        confirmButton = { TextButton(onClick = onClose) { Text("Descartar") } }, dismissButton = { TextButton(onClick = { confirmDiscard = false }) { Text("Continuar escrevendo") } })
}
