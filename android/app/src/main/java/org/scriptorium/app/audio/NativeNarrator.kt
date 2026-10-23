package org.scriptorium.app.audio

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.File
import java.util.UUID

data class LocalNarratorVoice(val id: String, val label: String, val language: String)

/** Native synthesis and playback are separate. TTS never speaks over another player. */
class NativeNarrator(private val context: Context, private val library: AudioLibrary) {
    private val ready = CompletableDeferred<Unit>()
    private val callbacks = java.util.concurrent.ConcurrentHashMap<String, CompletableDeferred<Unit>>()
    private val engine = TextToSpeech(context.applicationContext) { status ->
        if (status == TextToSpeech.SUCCESS) ready.complete(Unit)
        else ready.completeExceptionally(IllegalStateException("Voz nativa indisponível. Instale os dados de voz nas configurações do Android."))
    }
    init {
        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) = Unit
            override fun onDone(id: String?) { callbacks.remove(id)?.complete(Unit) }
            @Deprecated("Android compatibility") override fun onError(id: String?) { callbacks.remove(id)?.completeExceptionally(IllegalStateException("Falha ao preparar a voz local.")) }
            override fun onError(id: String?, errorCode: Int) { callbacks.remove(id)?.completeExceptionally(IllegalStateException("Falha de voz local ($errorCode). Verifique o idioma instalado.")) }
        })
    }
    suspend fun voices(): List<LocalNarratorVoice> {
        withTimeout(15000) { ready.await() }
        return engine.voices.orEmpty().filter { !it.isNetworkConnectionRequired }.sortedBy { it.name }
            .map { LocalNarratorVoice(it.name, "${it.locale.displayName} · ${it.name}", it.locale.toLanguageTag()) }
    }
    suspend fun render(text: String, language: String, selected: String): List<File> {
        val available = voices()
        val voice = available.firstOrNull { it.id == selected && it.language.substringBefore('-') == language.substringBefore('-') }
            ?: if (selected.isEmpty()) available.firstOrNull { it.language == language } ?: available.firstOrNull { it.language.substringBefore('-') == language.substringBefore('-') } else null
        requireNotNull(voice) { "Nenhuma voz local compatível com $language. Instale esse idioma ou escolha outra voz." }
        engine.voice = engine.voices.single { it.name == voice.id }
        engine.setSpeechRate(1f)
        val engineVersion = withContext(Dispatchers.IO) { context.packageManager.getPackageInfo(engine.defaultEngine, 0).longVersionCode }
        return narrationSegments(text).filter(String::isNotBlank).map { segment ->
            val key = audioHash("native-file-v1\u0000${engine.defaultEngine}\u0000$engineVersion\u0000${voice.id}\u0000$language\u0000$segment")
            val file = File(library.speechDirectory, "$key.wav")
            if (file.exists() && file.length() > 44) file else {
                val pending = File(library.speechDirectory, "$key.part")
                val id = UUID.randomUUID().toString()
                val done = CompletableDeferred<Unit>()
                callbacks[id] = done
                try {
                    require(engine.synthesizeToFile(segment, Bundle(), pending, id) == TextToSpeech.SUCCESS) { "O mecanismo recusou a síntese local." }
                    withTimeout(45000) { done.await() }
                    withContext(Dispatchers.IO) {
                        require(pending.length() > 44) { "A voz não produziu um arquivo válido." }
                        require(library.speechDirectory.listFiles().orEmpty().sumOf { it.length() } <= 200L * 1024 * 1024) { "Cache de voz cheio (200 MiB). Encerre o player e limpe o cache no módulo Áudio." }
                        require(pending.renameTo(file)) { "Não foi possível guardar a narração." }
                    }
                    file
                } finally {
                    callbacks.remove(id)
                    if (!done.isCompleted) engine.stop()
                    withContext(kotlinx.coroutines.NonCancellable + Dispatchers.IO) { pending.delete() }
                }
            }
        }
    }
    fun close() { engine.stop(); engine.shutdown(); callbacks.values.forEach { it.cancel() }; callbacks.clear() }
}
