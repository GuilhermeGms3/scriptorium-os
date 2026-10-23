package org.scriptorium.app.ui

import android.os.Bundle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.scriptorium.app.audio.*
import org.scriptorium.app.data.*

val LocalAudioClient = staticCompositionLocalOf<AudioClient> { error("Áudio não conectado ao shell") }

@Composable
fun AudioMiniPlayer(open: () -> Unit) {
    val audio = LocalAudioClient.current
    val state by audio.state.collectAsStateWithLifecycle()
    if (state.title.isBlank() && !state.busy) return
    Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Column(Modifier.weight(1f).clickable(onClick = open).padding(vertical = 8.dp)) {
                Text(if (state.busy) "Preparando voz local…" else state.title, maxLines = 1, style = MaterialTheme.typography.labelLarge)
                Text("Abrir Áudio", style = MaterialTheme.typography.labelSmall)
            }
            TextButton(onClick = { audio.toggle() }, enabled = state.title.isNotBlank()) { Text(if (state.playing) "Pausar" else "Ouvir") }
            TextButton(onClick = { audio.command("close") }) { Text("Encerrar") }
        }
    }
}

@Composable
fun AudioScreen(repository: MobileRepository, openPassage: (Passage) -> Unit) {
    val audio = LocalAudioClient.current
    val state by audio.state.collectAsStateWithLifecycle()
    val prefs = audio.library.preferences
    var section by rememberSaveable { mutableStateOf("Início") }
    var revision by remember { mutableIntStateOf(0) }
    DisposableEffect(prefs) {
        val listener = android.content.SharedPreferences.OnSharedPreferenceChangeListener { _, _ -> revision++ }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        onDispose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }
    var failure by remember { mutableStateOf<String?>(null) }
    var deleting by remember { mutableStateOf<AudioTrack?>(null) }
    var editing by remember { mutableStateOf<AudioTrack?>(null) }
    var clearCache by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch { try {
            val track = audio.importTrack(uri)
            audio.command("settings", Bundle().apply { putString("track", track.id) }); revision++
        } catch (error: Exception) { failure = error.message } }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Heading("Scriptorium Áudio", "Leitura literal e música pessoal. Offline, sem enviar seu texto a provedores.")
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { items(listOf("Início", "Reflexões", "Voz", "Ambiente")) { label -> FilterChip(section == label, { section = label }, label = { Text(label) }) } }
        if (!state.connected) Text("Conectando ao serviço de áudio…")
        (failure ?: state.message)?.let { message -> Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(message, Modifier.weight(1f), color = MaterialTheme.colorScheme.secondary)
            if (!state.busy) TextButton(onClick = { failure = null; audio.command("dismiss") }) { Text("Fechar aviso") }
        } }
        if (state.busy) { LinearProgressIndicator(Modifier.fillMaxWidth()); TextButton(onClick = { audio.command("cancel") }) { Text("Cancelar preparação") } }
        if (state.title.isNotBlank()) {
            Text(state.title, style = MaterialTheme.typography.titleLarge)
            Slider(value = state.position.toFloat().coerceIn(0f, state.duration.toFloat().coerceAtLeast(1f)), onValueChange = { audio.controller?.seekTo(it.toLong()) }, valueRange = 0f..state.duration.toFloat().coerceAtLeast(1f), enabled = state.duration > 0)
            Text("${timeLabel(state.position)} / ${timeLabel(state.duration)} · posição real deste segmento", style = MaterialTheme.typography.labelSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                TextButton(onClick = { audio.controller?.seekToPreviousMediaItem() }) { Text("Anterior") }
                Button(onClick = audio::toggle) { Text(if (state.playing) "Pausar" else "Ouvir") }
                TextButton(onClick = { audio.controller?.seekToNextMediaItem() }) { Text("Próximo") }
            }
            val entry = remember(state.entryId, revision) { runCatching { audio.library.entries().find { it.id == state.entryId } }.getOrNull() }
            entry?.let {
                TextButton(onClick = { runCatching { audio.library.favorite(it.id); revision++ }.onFailure { error -> failure = error.message } }) { Text(if (audio.library.isFavorite(it.id)) "Remover dos favoritos" else "Favoritar leitura") }
                if (it.source.optString("kind") == "scripture") TextButton(onClick = {
                    scope.launch { try {
                        val passage = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { decodePassage(it.source.optString("passage"), repository.editions()) }
                        if (passage != null) openPassage(passage) else failure = "A edição de origem não está mais instalada."
                    } catch (error: Exception) { failure = error.message } }
                }) { Text("Voltar à passagem de origem") }
                Text(it.source.optString("kind").let { kind -> if (kind == "scripture") "A origem preserva edição, esquema e unidades. Uso pessoal; sem exportação de gravação." else "Texto privado salvo apenas neste dispositivo." }, style = MaterialTheme.typography.labelSmall)
            }
        }
        when (section) {
            "Reflexões" -> ReflectionStudio(audio)
            "Início" -> {
                Heading("Suas leituras", "Retomar exige tocar em Ouvir; nunca começamos automaticamente.")
                val entries = remember(revision) { runCatching { audio.library.entries() }.getOrElse { failure = "Histórico indisponível. Seus livros e notas não foram alterados."; emptyList() } }
                if (entries.isEmpty()) Text("Nenhuma leitura preparada. Abra um capítulo em Escrituras ou escreva seu roteiro em Reflexões.")
                entries.sortedByDescending { audio.library.isFavorite(it.id) }.forEach { entry ->
                    OutlinedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) {
                        Text((if (audio.library.isFavorite(entry.id)) "★ " else "") + entry.title, style = MaterialTheme.typography.titleMedium)
                        Text("${entry.language} · ${narrationSegments(entry.text).size} segmentos", style = MaterialTheme.typography.bodySmall)
                        Row { TextButton(onClick = { audio.read(entry, resume = true) }, enabled = !state.busy) { Text("Continuar ouvindo") }; TextButton(onClick = { audio.read(entry, enqueue = true) }, enabled = !state.busy) { Text("À fila") } }
                    } }
                }
                Heading("Fila", "Capítulos adicionados em sequência continuam tocando ao sair da tela.")
                if (state.queue.isEmpty()) Text("A fila está vazia.")
                state.queue.forEachIndexed { index, titleInQueue -> TextButton(onClick = { audio.controller?.seekToDefaultPosition(index) }) { Text("${index + 1}. $titleInQueue") } }
                TextButton(onClick = { audio.command("clearQueue") }) { Text("Limpar fila e parar") }
                Text("Em Reflexões você pode escrever, revisar e salvar roteiros. Voz neural expressiva e geração por IA ainda não estão configuradas.", style = MaterialTheme.typography.bodySmall)
            }
            "Voz" -> {
                val voices = remember(revision) { runCatching { AudioLibrary.objects(prefs.getString("voices", "[]")!!) }.getOrDefault(emptyList()) }
                Text("Vozes locais reais instaladas. Não equivalem à voz neural expressiva de um provedor externo.")
                if (voices.isEmpty()) Text("Nenhuma voz local disponível. Instale dados de voz em Configurações do Android → Conversão de texto em voz e reabra o aplicativo.")
                val selected = prefs.getString("voice", "").orEmpty()
                var languageFilter by rememberSaveable { mutableStateOf("pt") }
                OutlinedTextField(languageFilter, { languageFilter = it.take(30) }, label = { Text("Filtrar idioma da voz (pt, en, es…)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                TextButton(onClick = { audio.command("settings", Bundle().apply { putString("voice", "") }) }) { Text(if (selected.isEmpty()) "✓ Automática por idioma" else "Automática por idioma") }
                voices.filter { it.getString("language").contains(languageFilter, true) }.forEach { voice -> TextButton(onClick = { audio.command("settings", Bundle().apply { putString("voice", voice.getString("id")) }) }) { Text((if (selected == voice.getString("id")) "✓ " else "") + voice.getString("label")) } }
                Text("A escolha de voz vale na próxima preparação. Arquivos em reprodução não são regenerados.", style = MaterialTheme.typography.bodySmall)
                Button(onClick = { audio.read(NarrationEntry.create("Prévia de voz", "Há um tempo para aprender, ouvir e refletir.", "pt-BR", JSONObject().put("kind", "personal"))) }, enabled = !state.busy) { Text("Ouvir prévia local") }
                AudioSlider("Velocidade", prefs.getFloat("rate", 1f), 0.5f..2f) { audio.command("settings", Bundle().apply { putFloat("rate", it) }) }
                AudioSlider("Volume da voz", prefs.getFloat("volume", 1f), 0f..1f) { audio.command("settings", Bundle().apply { putFloat("volume", it) }) }
                var profileName by rememberSaveable { mutableStateOf("") }
                OutlinedTextField(profileName, { profileName = it.take(60) }, label = { Text("Nome de um perfil de leitura") }, modifier = Modifier.fillMaxWidth())
                TextButton(enabled = profileName.isNotBlank(), onClick = {
                    val profiles = JSONObject(prefs.getString("profiles", "{}")!!)
                    if (profiles.length() < 20 || profiles.has(profileName.trim())) {
                        profiles.put(profileName.trim(), JSONObject().put("voice", selected).put("rate", prefs.getFloat("rate", 1f).toDouble()).put("volume", prefs.getFloat("volume", 1f).toDouble()))
                        prefs.edit().putString("profiles", profiles.toString()).apply(); profileName = ""
                    } else failure = "Limite de 20 perfis. Reutilize o nome de um perfil existente."
                }) { Text("Salvar perfil") }
                val profiles = remember(revision) { JSONObject(prefs.getString("profiles", "{}")!!) }
                profiles.keys().asSequence().toList().forEach { name -> Row {
                    TextButton(onClick = { val profile = profiles.getJSONObject(name); audio.command("settings", Bundle().apply { putString("voice", profile.getString("voice")); putFloat("rate", profile.getDouble("rate").toFloat()); putFloat("volume", profile.getDouble("volume").toFloat()) }) }) { Text("Aplicar $name") }
                    TextButton(onClick = { profiles.remove(name); prefs.edit().putString("profiles", profiles.toString()).apply() }) { Text("Remover perfil") }
                } }
                TextButton(onClick = { clearCache = true }) { Text("Limpar arquivos de voz preparados") }
            }
            "Ambiente" -> {
                Text("Importamos uma cópia privada. Só use músicas que você pode reproduzir; importação não concede direito de redistribuir.")
                Button(onClick = { failure = null; importer.launch(arrayOf("audio/*")) }) { Text("Adicionar minha música") }
                Text("Máximo 50 MiB por arquivo, 500 MiB/100 faixas. Decodificação depende do aparelho.", style = MaterialTheme.typography.bodySmall)
                AudioMode.entries.forEach { mode -> FilterChip(prefs.getString("mode", AudioMode.VOICE.name) == mode.name, { audio.command("settings", Bundle().apply { putString("mode", mode.name) }) }, label = { Text(mode.label) }) }
                AudioSlider("Volume musical", prefs.getFloat("musicVolume", 0.2f), 0f..1f) { audio.command("settings", Bundle().apply { putFloat("musicVolume", it) }) }
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) { Checkbox(prefs.getBoolean("loop", true), { audio.command("settings", Bundle().apply { putBoolean("loop", it) }) }); Text("Repetir trilha") }
                Text("Pausar, perder o foco de áudio ou encerrar pausa os dois canais. Trocar a trilha não reinicia a voz.", style = MaterialTheme.typography.bodySmall)
                val tracks = remember(revision) { runCatching { audio.library.tracks() }.getOrDefault(emptyList()) }
                if (tracks.isEmpty()) Text("Nenhuma música importada. Não distribuímos um catálogo fictício.")
                tracks.forEach { track -> OutlinedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
                    Text(track.title, style = MaterialTheme.typography.titleMedium); Text("${track.category} · ${timeLabel(track.durationMs)}")
                    Row { TextButton(onClick = { audio.command("settings", Bundle().apply { putString("track", track.id) }) }) { Text(if (prefs.getString("track", "") == track.id) "✓ Selecionada" else "Selecionar") }; TextButton(onClick = { editing = track }) { Text("Organizar") }; TextButton(onClick = { deleting = track }) { Text("Excluir") } }
                } } }
            }
        }
    }
    deleting?.let { track -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text("Excluir ${track.title}?") }, text = { Text("Só a cópia musical do Scriptorium será removida. O arquivo original não será alterado.") }, confirmButton = { TextButton(onClick = { audio.command("removeTrack", Bundle().apply { putString("track", track.id) }); deleting = null }) { Text("Excluir cópia") } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancelar") } }) }
    editing?.let { track ->
        var title by remember(track.id) { mutableStateOf(track.title) }; var category by remember(track.id) { mutableStateOf(track.category) }
        AlertDialog(onDismissRequest = { editing = null }, title = { Text("Organizar música") }, text = { Column { OutlinedTextField(title, { title = it.take(150) }, label = { Text("Nome") }); OutlinedTextField(category, { category = it.take(80) }, label = { Text("Categoria") }) } }, confirmButton = { TextButton(enabled = title.isNotBlank(), onClick = { audio.library.renameTrack(track.id, title, category); editing = null; revision++ }) { Text("Salvar") } }, dismissButton = { TextButton(onClick = { editing = null }) { Text("Cancelar") } })
    }
    if (clearCache) AlertDialog(onDismissRequest = { clearCache = false }, title = { Text("Limpar cache de voz?") }, text = { Text("Encerra a reprodução e remove apenas os WAV de voz preparados. Textos do histórico, livros e notas permanecem.") }, confirmButton = { TextButton(onClick = { audio.command("clearCache"); clearCache = false }) { Text("Limpar e parar") } }, dismissButton = { TextButton(onClick = { clearCache = false }) { Text("Cancelar") } })
}

@Composable private fun AudioSlider(label: String, current: Float, range: ClosedFloatingPointRange<Float>, change: (Float) -> Unit) {
    Column { Text("$label · ${"%.2f".format(current)}"); Slider(current, change, valueRange = range) }
}
private fun timeLabel(ms: Long): String = "${ms / 60000}:${((ms / 1000) % 60).toString().padStart(2, '0')}"

/** Selection uses real source text and UTF-16 positions; it never mutates the source. */
@Composable
fun AudioTextActions(title: String, text: String, language: String, source: JSONObject) {
    val audio = LocalAudioClient.current
    var selecting by remember { mutableStateOf(false) }
    var value by remember(text) { mutableStateOf(TextFieldValue(text)) }
    Row {
        TextButton(enabled = text.isNotBlank() && text.length <= 30000, onClick = { audio.read(NarrationEntry.create(title.take(300), text, language.ifBlank { "pt-BR" }, source)) }) { Text("Ouvir") }
        TextButton(enabled = text.isNotBlank() && text.length <= 30000, onClick = { audio.read(NarrationEntry.create(title.take(300), text, language.ifBlank { "pt-BR" }, source), enqueue = true) }) { Text("À fila") }
        TextButton(enabled = text.isNotBlank(), onClick = { selecting = true }) { Text("Selecionar texto") }
    }
    if (selecting) AlertDialog(onDismissRequest = { selecting = false }, title = { Text("Selecione o trecho para ouvir") }, text = {
        Column { Text("Segure e arraste as alças no texto. O original não é alterado."); OutlinedTextField(value, { value = it.copy(text = text) }, readOnly = true, modifier = Modifier.heightIn(min = 200.dp, max = 360.dp)) }
    }, confirmButton = { TextButton(enabled = !value.selection.collapsed && value.selection.length <= 30000, onClick = {
        val selected = text.substring(value.selection.min, value.selection.max)
        val origin = JSONObject(source.toString()).put("selectionStart", value.selection.min).put("selectionEnd", value.selection.max)
        audio.read(NarrationEntry.create(title.take(300), selected, language.ifBlank { "pt-BR" }, origin)); selecting = false
    }) { Text("Ouvir seleção") } }, dismissButton = { TextButton(onClick = { selecting = false }) { Text("Cancelar") } })
}

@Composable
fun ScriptureAudioActions(repository: MobileRepository, passage: Passage) {
    val audio = LocalAudioClient.current
    var dialog by remember { mutableStateOf(false) }
    var start by remember(passage) { mutableStateOf(passage.verse?.toString().orEmpty()) }
    var end by remember(passage) { mutableStateOf((passage.verseEnd ?: passage.verse)?.toString().orEmpty()) }
    TextButton(onClick = { dialog = true }) { Text("Ouvir passagem") }
    if (dialog) AlertDialog(onDismissRequest = { dialog = false }, title = { Text("${passage.title} ${passage.chapter}") }, text = {
        Column {
            Text("Deixe os campos vazios para o capítulo inteiro. Para ouvir capítulos sucessivos, adicione-os à mesma fila.")
            OutlinedTextField(start, { start = it.filter(Char::isDigit).take(3) }, label = { Text("Do versículo") })
            OutlinedTextField(end, { end = it.filter(Char::isDigit).take(3) }, label = { Text("Até o versículo") })
        }
    }, confirmButton = { TextButton(onClick = { audio.scripture(repository, passage, start.toIntOrNull(), end.toIntOrNull() ?: start.toIntOrNull(), false); dialog = false }) { Text("Ouvir") } }, dismissButton = {
        Row { TextButton(onClick = { audio.scripture(repository, passage, start.toIntOrNull(), end.toIntOrNull() ?: start.toIntOrNull(), true); dialog = false }) { Text("À fila") }; TextButton(onClick = { dialog = false }) { Text("Cancelar") } }
    })
}
