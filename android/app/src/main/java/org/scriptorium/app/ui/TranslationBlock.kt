package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
import org.scriptorium.app.data.*

@Composable
fun TranslationBlock(text: String, language: String, personal: PersonalRepository) {
    if (text.isBlank()) return
    val metadata = language.lowercase().substringBefore('-')
    var identified by remember(text, language) { mutableStateOf<String?>(null) }
    val unknown = metadata in listOf("und", "")
    LaunchedEffect(text, language) {
        if (unknown) identified = try { LocalTranslation.identify(text) }
        catch (_: kotlinx.coroutines.TimeoutCancellationException) { "und" }
        catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { "und" }
    }
    if (unknown && identified == null) return
    val declared = if (unknown) identified.orEmpty() else metadata
    if (declared in listOf("pt", "por")) return
    if (declared !in listOf("en", "eng", "es", "spa", "und", "")) {
        Text("Tradução local disponível para inglês e espanhol; este texto está em outro idioma.", style = MaterialTheme.typography.labelSmall)
        return
    }
    var source by remember(text, declared) { mutableStateOf(when (declared) { "en", "eng" -> "en"; "es", "spa" -> "es"; else -> null }) }
    if (source == null) {
        var choosing by remember(text) { mutableStateOf(false) }
        TextButton(onClick = { choosing = !choosing }) { Text("Idioma não identificado · escolher para traduzir") }
        if (choosing) Row { TextButton(onClick = { source = "en" }) { Text("Inglês") }; TextButton(onClick = { source = "es" }) { Text("Espanhol") } }
        return
    }
    var translated by remember(text, source) { mutableStateOf<String?>(null) }
    var busy by remember(text, source) { mutableStateOf(false) }
    var stage by remember(text, source) { mutableStateOf("") }
    var error by remember(text, source) { mutableStateOf<String?>(null) }
    var consent by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    TextButton(enabled = !busy, onClick = { consent = true }) { Text(if (busy) "Traduzindo…" else if (error != null) "Tentar tradução novamente" else "Traduzir para português") }
    if (busy) { LinearProgressIndicator(Modifier.fillMaxWidth()); Text(stage, style = MaterialTheme.typography.labelSmall) }
    if (consent) AlertDialog(onDismissRequest = { consent = false }, title = { Text("Tradução no aparelho") }, text = {
        Text("Se necessário, será baixado o modelo de idioma. Depois, a tradução pode ser usada offline. Nenhum trecho é enviado a um serviço de tradução. O resultado é automático; confira o original.")
    }, confirmButton = { TextButton(onClick = {
        consent = false; busy = true; error = null
        scope.launch {
            try { translated = LocalTranslation.translate(context, personal, text, requireNotNull(source)) { message -> stage = message } }
            catch (failure: kotlinx.coroutines.TimeoutCancellationException) { error = LocalTranslation.failureMessage(failure) }
            catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) { error = LocalTranslation.failureMessage(failure) }
            finally { busy = false }
        }
    }) { Text("Traduzir") } }, dismissButton = { TextButton(onClick = { consent = false }) { Text("Cancelar") } })
    translated?.let { Column(Modifier.padding(vertical = 8.dp)) { Text("Tradução automática local · confira o original", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary); Text(it) } }
    error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
}

@Composable
fun TranslationSettings() {
    var revision by remember { mutableIntStateOf(0) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column {
        Heading("Tradução local", "Prepare o idioma com internet antes de sair. A tradução dos trechos é feita no celular.")
        Load(revision, { Unit }) {
            val installed by produceState<Result<Set<String>>?>(null, revision) {
                value = try { Result.success(LocalTranslation.installed()) }
                catch (failure: kotlinx.coroutines.TimeoutCancellationException) { Result.failure(failure) }
                catch (cancelled: CancellationException) { throw cancelled }
                catch (failure: Exception) { Result.failure(failure) }
            }
            Text(installed?.fold({ models -> "Idiomas baixados: ${models.map { when (it) { "pt" -> "Português"; "es" -> "Espanhol"; "en" -> "Inglês"; else -> it } }.joinToString().ifBlank { "nenhum" }}" }, { "Não foi possível conferir os idiomas." }) ?: "Conferindo modelos…", style = MaterialTheme.typography.bodySmall)
        }
        listOf("en" to "Inglês → Português", "es" to "Espanhol → Português").forEach { (source, title) ->
            OutlinedButton(enabled = !busy, onClick = {
                busy = true; message = null
                scope.launch {
                    try { LocalTranslation.prepare(source) { message = it }; message = "Idioma preparado para uso offline."; revision++ }
                    catch (failure: kotlinx.coroutines.TimeoutCancellationException) { message = LocalTranslation.failureMessage(failure) }
                    catch (cancelled: CancellationException) { throw cancelled }
                    catch (failure: Exception) { message = LocalTranslation.failureMessage(failure) }
                    finally { busy = false }
                }
            }) { Text("Preparar $title") }
        }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        message?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
    }
}
