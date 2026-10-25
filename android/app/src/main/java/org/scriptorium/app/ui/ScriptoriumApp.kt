package org.scriptorium.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import org.scriptorium.app.AppModel
import org.scriptorium.app.data.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScriptoriumApp(model: AppModel) {
    val state by model.state.collectAsStateWithLifecycle()
    var destination by rememberSaveable { mutableStateOf("Início") }
    var history by rememberSaveable { mutableStateOf(listOf<String>()) }
    var requestedLibrary by remember { mutableStateOf<StudyReading?>(null) }
    var requestedGuide by rememberSaveable { mutableStateOf<String?>(null) }
    var menu by remember { mutableStateOf(false) }
    var readerHasPassage by remember { mutableStateOf(false) }
    var requestPanel by remember { mutableStateOf(false) }
    val motion = LocalReadingAppearance.current.motion
    var requestedPassage by remember { mutableStateOf<Passage?>(null) }
    var readingEntry by rememberSaveable { mutableIntStateOf(0) }
    var libraryEntry by rememberSaveable { mutableIntStateOf(0) }
    val screenState = rememberSaveableStateHolder()
    val context = LocalContext.current
    val preferences = remember { ReadingPreferences(context) }
    val tones = remember { runCatching { android.media.ToneGenerator(android.media.AudioManager.STREAM_MUSIC, 12) }.getOrNull() }
    DisposableEffect(tones) { onDispose { tones?.release() } }
    fun navigate(route: String) {
        if (route != destination) {
            history = (history + destination).takeLast(30)
            destination = route
            requestPanel = false
            val audio = context.getSystemService(android.content.Context.AUDIO_SERVICE) as android.media.AudioManager
            if (preferences.sound && audio.ringerMode == android.media.AudioManager.RINGER_MODE_NORMAL)
                tones?.startTone(when (route) { "Leitura" -> android.media.ToneGenerator.TONE_PROP_ACK; "Estudos" -> android.media.ToneGenerator.TONE_PROP_PROMPT; else -> android.media.ToneGenerator.TONE_PROP_BEEP }, 65)
        }
    }
    BackHandler(destination != "Início" || history.isNotEmpty()) {
        destination = history.lastOrNull() ?: "Início"
        history = history.dropLast(1)
    }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) {
        if (it != null) model.import(it)
    }
    fun importPackage() { importer.launch(arrayOf("application/zip", "application/octet-stream", "*/*")) }
    Scaffold(
        topBar = {
            Surface(color = MaterialTheme.colorScheme.surfaceContainer) {
                Box(Modifier.fillMaxWidth().statusBarsPadding().height(64.dp).padding(horizontal = 12.dp)) {
                    Text("SCRIPTORIUM", Modifier.align(androidx.compose.ui.Alignment.CenterStart).clickable { navigate("Início") }, style = MaterialTheme.typography.titleSmall)
                    if (destination != "Início") TextButton(onClick = { navigate("Início") }, modifier = Modifier.align(androidx.compose.ui.Alignment.Center), contentPadding = PaddingValues(horizontal = 8.dp)) { Text("Home", style = MaterialTheme.typography.labelLarge) }
                    Row(Modifier.align(androidx.compose.ui.Alignment.CenterEnd), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        if (destination == "Leitura" && readerHasPassage && state.ready && !state.busy)
                            TextButton(onClick = { requestPanel = true }, contentPadding = PaddingValues(horizontal = 4.dp)) { Text("Painel", style = MaterialTheme.typography.labelMedium) }
                        TextButton(onClick = { menu = true }, contentPadding = PaddingValues(horizontal = 8.dp)) { Text("Menu", style = MaterialTheme.typography.labelMedium) }
                    }
                }
            }
        },
        bottomBar = {
            if (state.ready && !state.busy) Column {
              AudioMiniPlayer { navigate("Áudio") }
              NavigationBar {
                listOf("Leitura" to "א", "Biblioteca" to "▤", "Estudos" to "◇", "Notas" to "✎", "Busca" to "⌕").forEach { (route, symbol) ->
                    NavigationBarItem(selected = destination == route, onClick = {
                        if (route == "Leitura") { requestedPassage = null; readerHasPassage = false; readingEntry++ }
                        if (route == "Biblioteca") { requestedLibrary = null; libraryEntry++ }
                        navigate(route)
                    },
                        icon = { Text(symbol) }, label = { Text(route, style = MaterialTheme.typography.labelSmall) })
                }
              }
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (state.message != null) Surface(color = MaterialTheme.colorScheme.surfaceVariant) {
                Row(Modifier.fillMaxWidth().padding(12.dp)) {
                    Text(state.message.orEmpty(), Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    if (!state.busy) TextButton(onClick = model::dismiss) { Text("Fechar") }
                }
            }
            if (state.busy) {
                LinearProgressIndicator(Modifier.fillMaxWidth())
                Text("Instalando em uma área separada. Não feche o aplicativo; a versão anterior não será substituída até a conferência terminar.", Modifier.padding(24.dp))
            } else if (!state.ready || destination == "Pacotes") {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp)) {
                    Heading("Seu acervo, com você", "Leitura e estudo offline. O processamento dos livros continua no PC.")
                    Text("Importe o arquivo .scriptorium preparado no computador. Ele traz as edições e os comentários existentes, com fonte, página e Rastro. Nenhuma ligação nova é produzida aqui.")
                    Spacer(Modifier.height(20.dp))
                    Button(onClick = ::importPackage) { Text(if (state.ready) "Instalar pacote ou patch" else "Importar acervo") }
                    if (state.ready) Load(state.revision, { model.store.current()?.manifest }) { manifest ->
                        Text("Versão instalada: ${manifest?.id?.take(12)}", Modifier.padding(top = 24.dp))
                        Text("${manifest?.editions?.size ?: 0} edições • ${manifest?.files?.size ?: 0} arquivos")
                    }
                    Spacer(Modifier.height(24.dp))
                    Text("Importe somente pacotes preparados por você ou por uma fonte confiável. Checksums verificam integridade, não autoria. Livros privados não devem ser publicados.", style = MaterialTheme.typography.bodySmall)
                }
            } else key(state.revision) { AnimatedContent(destination, modifier = Modifier.fillMaxSize(), transitionSpec = {
                (fadeIn(tween(if (motion) 440 else 0)) + slideInVertically(tween(if (motion) 440 else 0)) { if (motion) it / 28 else 0 }).togetherWith(fadeOut(tween(if (motion) 140 else 0)))
            }, label = "Abrir módulo") { route -> screenState.SaveableStateProvider(route) {
                when (route) {
                    "Leitura" -> key(readingEntry) { ReaderScreen(model.repository, model.personal, requestedPassage, requestPanel, { requestPanel = false }, { readerHasPassage = it }, { requestedPassage = null }) }
                    "Início" -> TodayScreen(model.repository, open = { requestedPassage = it; navigate("Leitura") }, openGuide = { requestedGuide = it; navigate("Estudos") })
                    "Biblioteca" -> key(libraryEntry) { LibraryScreen(model.repository, model.personal, requestedLibrary) }
                    "Estudos" -> StudyScreen(model.repository, model.personal, requestedGuide, { requestedPassage = it; navigate("Leitura") }, { requestedLibrary = it; navigate("Biblioteca") })
                    "Mapa" -> KnowledgeScreen(model.repository, model.personal)
                    "Notas" -> NotesScreen(model.personal)
                    "Áudio" -> AudioScreen(model.repository) { requestedPassage = it; navigate("Leitura") }
                    "Busca" -> SearchScreen(model.repository, model.personal) { requestedPassage = it; navigate("Leitura") }
                    "Rastro" -> TraceScreen(model.repository, model.personal)
                    "Ajustes e backup" -> PersonalSettings(model.personal)
                    "Aparência e leitura" -> AppearanceSettings()
                }
            } } }
        }
    }
    if (menu) androidx.compose.ui.window.Dialog(onDismissRequest = { menu = false }) {
        Surface(shape = MaterialTheme.shapes.extraLarge, tonalElevation = 8.dp) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Seu scriptorium", style = MaterialTheme.typography.titleLarge)
                listOf("Início" to "Aparência e leitura", "Áudio" to "Mapa", "Rastro" to "Pacotes", "Notas" to "Ajustes e backup").forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        listOf(pair.first, pair.second).forEach { route ->
                            OutlinedCard(onClick = { menu = false; navigate(route) }, modifier = Modifier.weight(1f).heightIn(min = 88.dp)) {
                                Box(Modifier.fillMaxWidth().heightIn(min = 88.dp).padding(12.dp), contentAlignment = androidx.compose.ui.Alignment.Center) {
                                    Text(route, textAlign = androidx.compose.ui.text.style.TextAlign.Center, style = MaterialTheme.typography.labelLarge)
                                }
                            }
                        }
                    }
                }
                TextButton(onClick = { menu = false }, modifier = Modifier.align(androidx.compose.ui.Alignment.CenterHorizontally)) { Text("Voltar à página") }
            }
        }
    }
}
