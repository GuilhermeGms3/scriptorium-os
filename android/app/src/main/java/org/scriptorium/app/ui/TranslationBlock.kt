package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import com.google.mlkit.common.model.DownloadConditions
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.scriptorium.app.data.PersonalRepository
import org.scriptorium.app.data.TranslationPolicy
import org.json.JSONObject
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

@Composable
fun TranslationBlock(text: String, language: String, personal: PersonalRepository) {
    if (text.isBlank()) return
    val declaredLanguage = language.lowercase().substringBefore('-')
    if (declaredLanguage !in listOf("en", "eng", "es", "spa", "und")) return
    var selectedLanguage by remember(text, language) { mutableStateOf<String?>(when (declaredLanguage) {
        "en", "eng" -> TranslateLanguage.ENGLISH
        "es", "spa" -> TranslateLanguage.SPANISH
        else -> null
    }) }
    val source = selectedLanguage
    if (source == null) {
        Text("Idioma de origem não informado. Traduzir somente se o texto estiver em:", style = MaterialTheme.typography.labelSmall)
        Row {
            TextButton(onClick = { selectedLanguage = TranslateLanguage.ENGLISH }) { Text("Inglês") }
            TextButton(onClick = { selectedLanguage = TranslateLanguage.SPANISH }) { Text("Espanhol") }
        }
        return
    }
    var translated by remember(text, language) { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var consent by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    TextButton(enabled = !busy, onClick = { consent = true }) { Text(if (busy) "Traduzindo no aparelho…" else "Traduzir para português") }
    if (consent) AlertDialog(onDismissRequest = { consent = false }, title = { Text("Tradução local") }, text = { Text("O modelo de idioma será baixado se necessário. A tradução é executada no aparelho, sem LLM; pode conter erros e não substitui o original. Este provedor Android é ML Kit, diferente do Marian usado no PC.") },
        confirmButton = { TextButton(onClick = {
            consent = false; busy = true; error = null
            scope.launch {
                try {
                    translated = withContext(Dispatchers.IO) {
                        val glossaryRaw = context.assets.open("theological-glossary.json").bufferedReader().use { it.readText() }
                        val hash = MessageDigest.getInstance("SHA-256").digest(("mlkit-v17:spans-v1:$glossaryRaw:$source:pt:$text").toByteArray()).joinToString("") { "%02x".format(it) }
                        personal.cachedTranslation(hash) ?: run {
                            val translator = Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(TranslateLanguage.PORTUGUESE).build())
                            try {
                                Tasks.await(translator.downloadModelIfNeeded(DownloadConditions.Builder().build()), 180, TimeUnit.SECONDS)
                                val output = TranslationPolicy.translate(text, JSONObject(glossaryRaw)) { Tasks.await(translator.translate(it), 60, TimeUnit.SECONDS) }
                                personal.cacheTranslation(hash, output, "ML Kit 17.0.3 · machine-generated")
                                output
                            } finally { translator.close() }
                        }
                    }
                } catch (_: Exception) { error = "Não foi possível traduzir. Confira a conexão para baixar o modelo; o original permanece intacto." }
                finally { busy = false }
            }
        }) { Text("Traduzir") } }, dismissButton = { TextButton(onClick = { consent = false }) { Text("Cancelar") } })
    translated?.let { value -> Column(Modifier.padding(vertical = 8.dp)) { Text("Tradução automática · confira o original", style = MaterialTheme.typography.labelSmall); Text(value) } }
    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
}
