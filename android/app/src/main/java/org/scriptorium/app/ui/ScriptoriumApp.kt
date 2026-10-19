package org.scriptorium.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import org.scriptorium.app.AppModel
import org.scriptorium.app.data.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScriptoriumApp(model: AppModel) {
    val state by model.state.collectAsStateWithLifecycle()
    var destination by rememberSaveable { mutableStateOf("Início") }
    var menu by remember { mutableStateOf(false) }
    var requestedPassage by remember { mutableStateOf<Passage?>(null) }
    val screenState = rememberSaveableStateHolder()
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) {
        if (it != null) model.import(it)
    }
    fun importPackage() { importer.launch(arrayOf("application/zip", "application/octet-stream", "*/*")) }
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("SCRIPTORIUM", style = MaterialTheme.typography.titleMedium) }, actions = {
                Box {
                    TextButton(onClick = { menu = true }) { Text("Mais") }
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                        listOf("Início", "Mapa", "Rastro", "Pacotes", "Ajustes e backup").forEach { route ->
                            DropdownMenuItem(text = { Text(route) }, onClick = { destination = route; menu = false })
                        }
                    }
                }
            })
        },
        bottomBar = {
            if (state.ready && !state.busy) NavigationBar {
                listOf("Leitura" to "א", "Biblioteca" to "▤", "Estudos" to "◇", "Notas" to "✎", "Busca" to "⌕").forEach { (route, symbol) ->
                    NavigationBarItem(selected = destination == route, onClick = { destination = route },
                        icon = { Text(symbol) }, label = { Text(route, style = MaterialTheme.typography.labelSmall) })
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
            } else key(state.revision) { screenState.SaveableStateProvider(destination) {
                when (destination) {
                    "Leitura" -> ReaderScreen(model.repository, model.personal, requestedPassage)
                    "Início" -> TodayScreen(model.repository, model.personal) { requestedPassage = it; destination = "Leitura" }
                    "Biblioteca" -> LibraryScreen(model.repository, model.personal)
                    "Estudos" -> StudyScreen(model.repository, model.personal) { requestedPassage = it; destination = "Leitura" }
                    "Mapa" -> KnowledgeScreen(model.repository, model.personal)
                    "Notas" -> NotesScreen(model.personal)
                    "Busca" -> SearchScreen(model.repository, model.personal) { requestedPassage = it; destination = "Leitura" }
                    "Rastro" -> TraceScreen(model.repository, model.personal)
                    "Ajustes e backup" -> PersonalSettings(model.personal)
                }
            } }
        }
    }
}
