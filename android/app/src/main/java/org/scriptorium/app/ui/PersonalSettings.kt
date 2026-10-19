package org.scriptorium.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.scriptorium.app.data.PersonalRepository
import org.scriptorium.app.data.text

@Composable
fun PersonalSettings(personal: PersonalRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var revision by remember { mutableIntStateOf(0) }
    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) { busy = true; scope.launch {
            try { withContext(Dispatchers.IO) { val raw = personal.backup(); requireNotNull(context.contentResolver.openOutputStream(uri)).bufferedWriter().use { it.write(raw) } }; message = "Backup pessoal exportado. Guarde-o em local privado." }
            catch (failure: Exception) { message = "Falha ao exportar: ${failure.message}" } finally { busy = false }
        } }
    }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) { busy = true; scope.launch {
            try { withContext(Dispatchers.IO) {
                val raw = requireNotNull(context.contentResolver.openInputStream(uri)).bufferedReader().use { reader ->
                    val output = StringBuilder(); val chunk = CharArray(8192)
                    while (true) { val size = reader.read(chunk); if (size < 0) break; require(output.length + size <= 20_000_000) { "Backup excede o limite." }; output.append(chunk, 0, size) }; output.toString()
                }
                personal.restore(raw)
            }; message = "Backup incorporado sem substituir notas com IDs já presentes."; revision++ }
            catch (failure: Exception) { message = "Falha ao restaurar; transação revertida: ${failure.message}" } finally { busy = false }
        } }
    }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Heading("Seus dados pessoais", "Notas, grupos, pastas, links, progresso e favoritos ficam separados dos pacotes de conteúdo.") }
        item { Text("O backup contém dados pessoais em texto claro. Não publique nem envie a terceiros. Ele não contém os PDFs: estes acompanham seu APK/pacote privado.") }
        item { Button(enabled = !busy, onClick = { exporter.launch("scriptorium-notas-${java.time.LocalDate.now()}.json") }) { Text("Exportar backup pessoal") } }
        item { OutlinedButton(enabled = !busy, onClick = { importer.launch(arrayOf("application/json", "application/octet-stream")) }) { Text("Restaurar backup Android") } }
        if (busy) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        message?.let { item { Text(it) } }
        item { Heading("Favoritos e marcações") }
        item { Load(revision, personal::bookmarks) { marks -> Column { if (marks.isEmpty()) Text("Nenhuma marcação salva."); marks.forEach { Text("${it.text("label")}\n${it.text("body")}", Modifier.padding(vertical = 8.dp)) } } } }
    }
}
