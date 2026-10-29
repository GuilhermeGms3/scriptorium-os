package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.json.JSONObject
import org.scriptorium.app.audio.*

/** Real authoring/review workflow. No claim of LLM generation or expressive neural synthesis. */
@Composable
fun ReflectionStudio(audio: AudioClient) {
    val prefs = audio.library.preferences
    val draft = remember { runCatching { JSONObject(prefs.getString("reflection-draft", "{}")!!) }.getOrDefault(JSONObject()) }
    var title by remember { mutableStateOf(draft.optString("title")) }
    var theme by remember { mutableStateOf(draft.optString("theme")) }
    var script by remember { mutableStateOf(draft.optString("script")) }
    var projectId by remember { mutableStateOf(draft.optString("projectId").ifBlank { java.util.UUID.randomUUID().toString() }) }
    var style by remember { mutableStateOf(draft.optString("style", "Contemplativo")) }
    var reviewed by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var revision by remember { mutableIntStateOf(0) }
    var deleting by remember { mutableStateOf<NarrationEntry?>(null) }
    val state by audio.state.collectAsState()
    fun saveDraft() { prefs.edit().putString("reflection-draft", JSONObject().put("version", 1).put("projectId", projectId).put("style", style).put("title", title).put("theme", theme).put("script", script).toString()).apply() }
    Heading("Scriptorium Reflexões", "Seu roteiro, suas fontes e uma revisão antes de narrar.")
    Text("Nesta etapa você escreve o roteiro. A narração usa a voz local instalada; não produz respirações, emoção cinematográfica ou roteiro por IA. O provedor neural ainda não está configurado.", style = MaterialTheme.typography.bodySmall)
    OutlinedTextField(title, { title = it.take(300); reviewed = false; saveDraft() }, label = { Text("Título do episódio") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(theme, { theme = it.take(200); reviewed = false; saveDraft() }, label = { Text("Tema ou série") }, modifier = Modifier.fillMaxWidth())
    Text("Direção editorial · não altera a expressividade da voz nativa", style = MaterialTheme.typography.labelSmall)
    androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        items(8) { index -> val name = listOf("Contemplativo", "Cinematográfico", "Melancólico", "Esperançoso", "Exortativo", "Histórico", "Expositivo", "Personalizado")[index]
            FilterChip(style == name, { style = name; reviewed = false; saveDraft() }, label = { Text(name) }) }
    }
    OutlinedTextField(script, { script = it.take(30000); reviewed = false; saveDraft() }, label = { Text("Roteiro autoral — separe os trechos por parágrafos") }, modifier = Modifier.fillMaxWidth().heightIn(min = 260.dp), supportingText = { Text("${script.length}/30.000 · rascunho salvo neste dispositivo") })
    Row { Checkbox(reviewed, { reviewed = it }); Text("Revisei o roteiro e conferi as citações. Interpretações são minhas, não o texto bíblico original.", Modifier.weight(1f)) }
    Text("Estimativa de leitura: ${script.split(Regex("\\s+")).count { it.isNotBlank() } * 60 / 140} s a 140 palavras/minuto. A duração real depende da voz e velocidade.", style = MaterialTheme.typography.bodySmall)
    Text("Trilha e volume: configurações atuais de Ambiente. Serão guardadas neste episódio.", style = MaterialTheme.typography.bodySmall)
    fun entry(): NarrationEntry = NarrationEntry.create(title, script, "pt-BR", JSONObject().put("kind", "reflection").put("version", 1).put("projectId", projectId).put("style", style).put("theme", theme).put("authorship", "user").put("reviewed", true).put("voiceProvider", "android-native").put("musicTrack", prefs.getString("track", "")).put("musicVolume", prefs.getFloat("musicVolume", 0.2f).toDouble()))
    Row {
        Button(enabled = reviewed && title.isNotBlank() && script.isNotBlank(), onClick = { runCatching { audio.library.saveEntry(entry()); revision++; message = "Reflexão salva na coleção local." }.onFailure { message = it.message } }) { Text("Salvar episódio") }
        TextButton(enabled = !state.busy && reviewed && title.isNotBlank() && script.isNotBlank(), onClick = { audio.read(entry()) }) { Text("Narrar com voz local") }
    }
    TextButton(onClick = { projectId = java.util.UUID.randomUUID().toString(); title = ""; theme = ""; script = ""; reviewed = false; saveDraft() }) { Text("Novo roteiro") }
    message?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
    Heading("Sua coleção")
    Text("Até 100 episódios / 4 MiB de roteiros, separados do histórico de 30 leituras. Só neste dispositivo; não incluídos no backup de notas.", style = MaterialTheme.typography.bodySmall)
    val saved = remember(revision) { audio.library.entries().filter { it.source.optString("kind") == "reflection" } }
    if (saved.isEmpty()) Text("Nenhuma reflexão salva. Não há episódios fictícios.")
    saved.forEach { episode -> OutlinedCard(Modifier.fillMaxWidth().padding(vertical = 4.dp)) { Column(Modifier.padding(12.dp)) {
        Text(episode.title, style = MaterialTheme.typography.titleMedium)
        Text(episode.source.optString("theme"), style = MaterialTheme.typography.bodySmall)
        Row {
            TextButton(onClick = { projectId = episode.source.optString("projectId").ifBlank { episode.id }; title = episode.title; theme = episode.source.optString("theme"); style = episode.source.optString("style", "Contemplativo"); script = episode.text; reviewed = false; saveDraft() }) { Text("Editar roteiro") }
            TextButton(enabled = !state.busy, onClick = { audio.read(episode, resume = true) }) { Text("Continuar ouvindo") }
        }
        TextButton(onClick = { deleting = episode }) { Text("Remover episódio") }
    } } }
    deleting?.let { episode -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text("Remover ${episode.title}?") }, text = { Text("Remove o roteiro da coleção, não seus livros ou notas. Arquivos de voz em cache permanecem até a limpeza explícita.") }, confirmButton = { TextButton(onClick = { audio.library.removeReflection(episode.id); revision++; deleting = null }) { Text("Remover") } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancelar") } }) }
}
