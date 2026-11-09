package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import org.scriptorium.app.data.*

/** One reading-wide switch, keeping IDs and original text intact for notes and citations. */
@Composable
internal fun PrimaryFeedTranslation(units: List<Row>, language: String, personal: PersonalRepository,
    enabled: Boolean, enable: (Boolean) -> Unit, content: @Composable (Map<String, String>) -> Unit) {
    val context = LocalContext.current
    var detected by remember(language, units) { mutableStateOf<String?>(null) }
    val declared = language.lowercase().substringBefore('-')
    LaunchedEffect(language, units) {
        detected = when (declared) {
            "en", "eng" -> "en"
            "es", "spa" -> "es"
            "pt", "por" -> "pt"
            "", "und" -> try { LocalTranslation.identify(units.joinToString(" ") { it.text("surface_text") }.take(4000)) }
                catch (_: TimeoutCancellationException) { "und" }
                catch (cancelled: CancellationException) { throw cancelled }
                catch (_: Exception) { "und" }
            else -> declared
        }
    }
    var translations by remember(units) { mutableStateOf<Map<String, String>>(emptyMap()) }
    var busy by remember(units) { mutableStateOf(false) }
    var error by remember(units) { mutableStateOf<String?>(null) }
    var stage by remember(units) { mutableStateOf("") }
    var retry by remember { mutableIntStateOf(0) }
    var consent by remember { mutableStateOf(false) }
    LaunchedEffect(enabled, units, detected, retry) {
        val source = detected
        if (!enabled || source !in listOf("en", "es")) return@LaunchedEffect
        busy = true; error = null
        try {
            translateReadingFeed(units, { text ->
                LocalTranslation.translate(context, personal, text, requireNotNull(source)) { stage = it }
            }) { id, translated -> translations = translations + (id to translated) }
        } catch (failure: TimeoutCancellationException) { error = LocalTranslation.failureMessage(failure) }
        catch (cancelled: CancellationException) { throw cancelled }
        catch (failure: Exception) { error = LocalTranslation.failureMessage(failure) }
        finally { busy = false }
    }
    if (detected in listOf("en", "es")) {
        Row {
            TextButton(onClick = { if (enabled) enable(false) else consent = true }) { Text(if (enabled) "Ver original" else "Traduzir leitura") }
            if (error != null && enabled) TextButton(onClick = { retry++ }) { Text("Tentar novamente") }
        }
        if (enabled && busy) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
            Text("${translations.size}/${units.size} · $stage", style = MaterialTheme.typography.labelSmall)
        } else if (enabled && error == null) Text("Tradução automática local", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
        if (enabled) error?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
    } else if (detected == "und") Row {
        TextButton(onClick = { detected = "en" }) { Text("Idioma: inglês") }
        TextButton(onClick = { detected = "es" }) { Text("Idioma: espanhol") }
    } else if (detected != null && detected != "pt") Text("Tradução local indisponível para este idioma.", style = MaterialTheme.typography.labelSmall)
    if (consent) AlertDialog(onDismissRequest = { consent = false }, title = { Text("Traduzir leitura") }, text = {
        Text("Traduzir as unidades carregadas e continuar nas próximas. O modelo pode precisar ser baixado; o texto é traduzido no aparelho. O original permanece disponível.")
    }, confirmButton = { TextButton(onClick = { consent = false; enable(true) }) { Text("Traduzir") } },
        dismissButton = { TextButton(onClick = { consent = false }) { Text("Cancelar") } })
    content(if (enabled) translations else emptyMap())
}
