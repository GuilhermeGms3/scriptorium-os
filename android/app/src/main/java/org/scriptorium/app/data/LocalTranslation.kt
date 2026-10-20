package org.scriptorium.app.data

import android.content.Context
import com.google.android.gms.tasks.Task
import com.google.mlkit.common.MlKitException
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.security.MessageDigest
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

suspend fun <T> Task<T>.translationAwait(): T = suspendCancellableCoroutine { continuation ->
    addOnCompleteListener(java.util.concurrent.Executor { it.run() }) { task ->
        if (continuation.isActive) {
            if (task.isSuccessful) continuation.resume(task.result)
            else continuation.resumeWithException(task.exception ?: IllegalStateException("Operação de tradução interrompida."))
        }
    }
}

object LocalTranslation {
    private fun requiredModels(source: String) = (listOf("pt") + if (source == "en") emptyList() else listOf(source)).toSet()
    suspend fun installed(): Set<String> = withTimeout(15_000) {
        RemoteModelManager.getInstance().getDownloadedModels(TranslateRemoteModel::class.java).translationAwait().map { it.language }.toSet()
    }
    suspend fun prepare(source: String, stage: (String) -> Unit = {}) {
        require(source in listOf("en", "es"))
        val translator = Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage("pt").build())
        try { ensureModels(translator, source, stage) } finally { translator.close() }
    }
    private suspend fun ensureModels(translator: Translator, source: String, stage: (String) -> Unit) {
        stage("Conferindo idiomas no aparelho…")
        val downloaded = installed()
        // Do not ask the downloader to check for updates during a genuinely offline reading session.
        if (!downloaded.containsAll(requiredModels(source))) {
            stage("Baixando modelo de idioma… Mantenha a conexão; o primeiro uso pode levar alguns minutos.")
            withTimeout(240_000) { translator.downloadModelIfNeeded(DownloadConditions.Builder().build()).translationAwait() }
        }
    }
    suspend fun translate(context: Context, personal: PersonalRepository, text: String, source: String, stage: (String) -> Unit): String = withContext(Dispatchers.IO) {
        require(source in listOf("en", "es") && text.length <= 100_000) { "Selecione um trecho menor para traduzir." }
        val glossaryRaw = context.assets.open("theological-glossary.json").bufferedReader().use { it.readText() }
        val hash = MessageDigest.getInstance("SHA-256").digest(("mlkit-v17:spans-v2:$glossaryRaw:$source:pt:$text").toByteArray()).joinToString("") { "%02x".format(it) }
        personal.cachedTranslation(hash)?.let { return@withContext it }
        val translator = Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage("pt").build())
        try {
            ensureModels(translator, source, stage)
            stage("Traduzindo no aparelho…")
            val glossary = JSONObject(glossaryRaw)
            // Existing policy protects terms. Suspending the engine avoids blocking a worker for every Task.
            val chunks = TranslationPolicy.chunks(text)
            val output = StringBuilder()
            for ((index, chunk) in chunks.withIndex()) {
                stage("Traduzindo trecho ${index + 1} de ${chunks.size}…")
                output.append(TranslationPolicy.translateSuspending(chunk, glossary) { value -> withTimeout(60_000) { translator.translate(value).translationAwait() } })
            }
            output.toString().also { personal.cacheTranslation(hash, it, "ML Kit 17.0.3 · machine-generated") }
        } finally { translator.close() }
    }
    fun failureMessage(failure: Exception): String {
        val cause = generateSequence<Throwable>(failure) { it.cause }.last()
        return when {
            failure is kotlinx.coroutines.TimeoutCancellationException -> "O preparo ou a tradução demorou além do limite. Confira a conexão e tente novamente; o modelo pode continuar sendo baixado."
            cause is MlKitException -> "O tradutor local não conseguiu concluir (código ${cause.errorCode}). Prepare o idioma em Ajustes e backup → Tradução local e tente novamente."
            else -> "Não foi possível traduzir localmente. Confira espaço livre e conexão no primeiro download. O original permanece disponível."
        }
    }
}
