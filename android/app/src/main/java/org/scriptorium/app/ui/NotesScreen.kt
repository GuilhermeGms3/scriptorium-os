package org.scriptorium.app.ui

import androidx.activity.compose.BackHandler
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.scriptorium.app.data.*

@Composable
fun NotesScreen(personal: PersonalRepository) {
    var revision by remember { mutableIntStateOf(0) }
    var editing by remember { mutableStateOf<Row?>(null) }
    var new by remember { mutableStateOf(false) }
    var group by remember { mutableStateOf<Row?>(null) }
    var folder by remember { mutableStateOf<String?>(null) }
    var create by remember { mutableStateOf<String?>(null) }
    var name by remember { mutableStateOf("") }
    var color by remember { mutableStateOf("#bca16a") }
    var graph by remember { mutableStateOf(false) }
    var feedback by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    BackHandler(folder != null || group != null || graph) {
        when { graph -> graph = false; folder != null -> folder = null; else -> group = null }
    }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("Notas", "Pessoais e locais: atualizações do acervo não substituem suas anotações.")
        Row {
            Button(onClick = { new = true }) { Text("Nova nota") }
            TextButton(onClick = { create = "group"; name = "" }) { Text("Grupo") }
            TextButton(enabled = group != null, onClick = { create = "folder"; name = "" }) { Text("Pasta") }
            TextButton(onClick = { graph = !graph }) { Text(if (graph) "Lista" else "Grafo") }
        }
        feedback?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Load(revision, personal::groups) { groups ->
            androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { FilterChip(group == null, { group = null; folder = null }, label = { Text("Todas") }) }
                items(groups, key = { it.text("id") }) { item -> FilterChip(group?.get("id") == item["id"], { group = item; folder = null }, label = { Text(item.text("title")) }) }
            }
        }
        val selectedGroup = group
        if (selectedGroup != null) Load(selectedGroup.text("id") to revision, { personal.folders(selectedGroup.text("id")) }) { folders ->
            BackHandler(folder != null) { folder = folders.find { it.text("id") == folder }?.get("parent_id") }
            Column {
                TextButton(onClick = { folder = folders.find { it.text("id") == folder }?.get("parent_id") }) { Text(if (folder == null) selectedGroup.text("title") else "↑ ${folders.find { it.text("id") == folder }?.text("name")}") }
                folders.filter { it["parent_id"] == folder }.forEach { item -> TextButton(onClick = { folder = item.text("id") }) { Text("▸ ${item.text("name")}") } }
            }
        }
        Load(Triple(revision, group?.get("id"), folder), { personal.notes(group?.get("id"), folder) to personal.edges() }) { (notes, edges) ->
            if (graph) KnowledgeGraph(notes.mapIndexed { index, row ->
                val angle = index * 2.0 * Math.PI / notes.size.coerceAtLeast(1)
                val hex = row["color"] ?: group?.get("color") ?: "#bca16a"
                GraphNode(row.text("id"), row.text("title"), (540 + cos(angle) * 360).toFloat(), (380 + sin(angle) * 250).toFloat(), Color(android.graphics.Color.parseColor(hex)))
            }, edges.map { GraphEdge(it.text("source_id"), it.text("target_id")) }) { id -> editing = notes.find { it.text("id") == id } }
            else LazyColumn {
            if (notes.isEmpty()) item { Text("Suas notas aparecerão aqui.", Modifier.padding(vertical = 24.dp)) }
            items(notes, key = { it.text("id") }) { note ->
                ListItem(headlineContent = { Text(note.text("title")) }, supportingContent = { Text(note.text("body").take(160)) }, modifier = Modifier.clickable { editing = note })
            }
        } }
    }
    if (new || editing != null) NoteEditor(personal, editing, editing?.get("source_id"), group?.get("id"), folder, onClose = { new = false; editing = null; revision++ })
    create?.let { kind -> AlertDialog(onDismissRequest = { create = null }, title = { Text(if (kind == "group") "Novo grupo" else "Nova pasta") }, text = {
        Column { OutlinedTextField(name, { name = it.take(120) }, label = { Text("Nome") }); if (kind == "group") NoteColorPicker(color) { color = it } }
    }, confirmButton = { TextButton(enabled = name.isNotBlank(), onClick = { scope.launch {
        try { withContext(Dispatchers.IO) { if (kind == "group") personal.createGroup(name, color) else personal.createFolder(requireNotNull(group).text("id"), folder, name) }; create = null; revision++ }
        catch (failure: Exception) { feedback = failure.message; create = null }
    } }) { Text("Criar") } }, dismissButton = { TextButton(onClick = { create = null }) { Text("Cancelar") } }) }
}

@Composable
fun NoteEditor(personal: PersonalRepository, existing: Row?, sourceId: String?, groupId: String? = null, folderId: String? = null, onClose: () -> Unit) {
    var title by rememberSaveable(existing?.get("id")) { mutableStateOf(existing?.text("title").orEmpty()) }
    var body by rememberSaveable(existing?.get("id")) { mutableStateOf(existing?.text("body").orEmpty()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmDiscard by remember { mutableStateOf(false) }
    var linkPicker by remember { mutableStateOf(false) }
    var linkQuery by remember { mutableStateOf("") }
    var noteColor by rememberSaveable(existing?.get("id")) { mutableStateOf(existing?.get("color") ?: "#bca16a") }
    var selection by remember { mutableStateOf(TextRange(body.length)) }
    var preview by remember { mutableStateOf(false) }
    var connected by remember { mutableStateOf<Row?>(null) }
    val dirty = title != existing?.text("title").orEmpty() || body != existing?.text("body").orEmpty() || noteColor != (existing?.get("color") ?: "#bca16a")
    val scope = rememberCoroutineScope()
    fun close() { if (!busy) { if (dirty) confirmDiscard = true else onClose() } }
    Dialog(onDismissRequest = ::close, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().systemBarsPadding().imePadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Heading(if (existing == null) "Nova nota" else "Editar nota")
                OutlinedTextField(title, { title = it.take(300) }, label = { Text("Título") }, modifier = Modifier.fillMaxWidth(), enabled = !busy)
                Row { TextButton(onClick = { linkPicker = true }) { Text("[[ Link") }; TextButton(onClick = { preview = !preview }) { Text(if (preview) "Editar" else "Ler") } }
                NoteColorPicker(noteColor, enabled = !busy) { noteColor = it }
                if (!preview) OutlinedTextField(TextFieldValue(body, selection), { value ->
                    body = value.text.take(200_000); selection = TextRange(value.selection.start.coerceAtMost(body.length), value.selection.end.coerceAtMost(body.length))
                    val before = body.take(selection.start)
                    if (before.endsWith("[[") || before.endsWith("/")) linkPicker = true
                }, label = { Text("Sua anotação · Markdown e [[links]]") }, modifier = Modifier.weight(1f).fillMaxWidth(), enabled = !busy)
                else Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState())) {
                    body.lines().forEach { line -> Text(line.removePrefix("# ").removePrefix("## "), style = if (line.startsWith("#")) MaterialTheme.typography.titleLarge else MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(vertical = 4.dp)) }
                    Load(existing?.get("id") to body, personal::list) { notes ->
                        Regex("\\[\\[([^]\\n]+)]]").findAll(body).map { it.groupValues[1].substringBefore('|') }.distinct().forEach { key ->
                            notes.find { it.text("id") == key || it.text("title") == key }?.let { target -> TextButton(onClick = { connected = target }) { Text("↗ ${target.text("title")}") } }
                        }
                    }
                    if (existing != null) Load(existing.text("id"), { personal.backlinks(existing.text("id")) }) { backlinks ->
                        if (backlinks.isNotEmpty()) Heading("Referências recebidas")
                        backlinks.forEach { target -> TextButton(onClick = { connected = target }) { Text(target.text("title")) } }
                    }
                }
                if (sourceId != null) Text("Origem preservada: ${sourceId.take(90)}", style = MaterialTheme.typography.labelSmall)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    TextButton(onClick = ::close, enabled = !busy) { Text("Fechar") }
                    Button(enabled = !busy && title.isNotBlank(), onClick = {
                        busy = true
                        scope.launch {
                            try {
                                withContext(Dispatchers.IO) {
                                    val id = personal.save(existing?.get("id"), title, body, sourceId, noteColor)
                                    if (groupId != null) personal.placeNote(id, groupId, folderId, noteColor)
                                }
                                onClose()
                            } catch (failure: Exception) { error = failure.message }
                            finally { busy = false }
                        }
                    }) { Text(if (busy) "Salvando…" else "Salvar") }
                }
            }
        }
    }
    if (linkPicker) AlertDialog(onDismissRequest = { linkPicker = false }, title = { Text("Conectar nota") }, confirmButton = { TextButton(onClick = { linkPicker = false }) { Text("Fechar") } }, text = {
        Column {
            OutlinedTextField(linkQuery, { linkQuery = it }, label = { Text("Encontrar nota") })
            Load(linkQuery, personal::list) { notes -> LazyColumn(Modifier.heightIn(max = 360.dp)) {
                items(notes.filter { it["id"] != existing?.get("id") && it.text("title").contains(linkQuery, true) }, key = { it.text("id") }) { target ->
                    TextButton(onClick = {
                        val before = body.take(selection.start).removeSuffix("[[").removeSuffix("/")
                        val link = "[[${target.text("id")}|${target.text("title").replace(Regex("[\\[\\]|\\r\\n]"), " ")}]]"
                        body = before + link + body.drop(selection.end)
                        selection = TextRange(before.length + link.length)
                        linkPicker = false
                    }) { Text(target.text("title")) }
                }
            } }
        }
    })
    if (confirmDiscard) AlertDialog(onDismissRequest = { confirmDiscard = false }, title = { Text("Descartar alterações?") }, text = { Text("As alterações ainda não salvas serão perdidas.") },
        confirmButton = { TextButton(onClick = onClose) { Text("Descartar") } }, dismissButton = { TextButton(onClick = { confirmDiscard = false }) { Text("Continuar escrevendo") } })
    connected?.let { target -> NoteEditor(personal, target, target["source_id"]) { connected = null } }
}
