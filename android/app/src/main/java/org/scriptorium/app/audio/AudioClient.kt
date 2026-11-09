package org.scriptorium.app.audio

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Bundle
import androidx.core.content.ContextCompat
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionToken
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import org.scriptorium.app.data.*

data class DeviceAudioState(val connected: Boolean = false, val playing: Boolean = false, val title: String = "", val position: Long = 0,
    val duration: Long = 0, val busy: Boolean = false, val message: String? = null, val queue: List<String> = emptyList(), val entryId: String = "")

/** Activity-independent control surface, not another playback engine. */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class AudioClient(context: Context) {
    val library = AudioLibrary(context.applicationContext)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val mutable = MutableStateFlow(DeviceAudioState())
    val state = mutable.asStateFlow()
    var controller: MediaController? = null
        private set
    private val future = MediaController.Builder(context.applicationContext, SessionToken(context, ComponentName(context, ScriptoriumAudioService::class.java))).buildAsync()
    private val listener = object : Player.Listener { override fun onEvents(player: Player, events: Player.Events) { update() } }
    init {
        future.addListener({
            try { controller = future.get().also { it.addListener(listener) }; update() }
            catch (failure: Exception) { mutable.value = mutable.value.copy(message = "Não foi possível conectar ao player. ${failure.message.orEmpty()}") }
        }, ContextCompat.getMainExecutor(context))
        scope.launch { while (isActive) { delay(500); update() } }
    }
    private fun update() {
        val player = controller ?: return
        mutable.value = DeviceAudioState(true, player.isPlaying, player.mediaMetadata.title?.toString().orEmpty(), player.currentPosition.coerceAtLeast(0), player.duration.coerceAtLeast(0),
            library.preferences.getBoolean("busy", false), library.preferences.getString("message", null),
            (0 until player.mediaItemCount).map { player.getMediaItemAt(it).mediaMetadata.title.toString() }, player.currentMediaItem?.mediaMetadata?.extras?.getString("entryId").orEmpty())
    }
    fun command(action: String, values: Bundle = Bundle()) {
        val player = controller ?: run { mutable.value = mutable.value.copy(message = "O player está conectando. Tente novamente."); return }
        values.putString("action", action)
        player.sendCustomCommand(SessionCommand(ScriptoriumAudioService.COMMAND, Bundle.EMPTY), values)
    }
    fun read(entry: NarrationEntry, enqueue: Boolean = false, resume: Boolean = false) {
        command("read", Bundle().apply { putString("entry", entry.json().toString()); putBoolean("enqueue", enqueue); putBoolean("resume", resume) })
    }
    fun scripture(repository: MobileRepository, passage: Passage, start: Int?, end: Int?, enqueue: Boolean) {
        scope.launch {
            try {
                val entry = withContext(Dispatchers.IO) {
                    require(start == null && end == null || start != null && start > 0 && end != null && end >= start) { "Informe início e fim válidos, ou deixe os dois vazios para o capítulo inteiro." }
                    val units = repository.verses(passage).filter { start == null || it.number("verse_start") <= requireNotNull(end) && it.number("verse_end").coerceAtLeast(it.number("verse_start")) >= start }
                    require(units.isNotEmpty()) { "A passagem não está disponível nesta edição." }
                    if (start != null) require(units.first().number("verse_start") == start && units.last().number("verse_end").coerceAtLeast(units.last().number("verse_start")) == end) { "Selecione os limites reais das unidades desta edição." }
                    val metadata = repository.editionAudioMetadata(passage.edition)
                    val title = "${passage.title} ${passage.chapter}" + if (start != null) ":$start" + if (end != start) "–$end" else "" else ""
                    NarrationEntry.create(title, units.joinToString("\n") { it.text("surface_text") }, metadata["language"] ?: "pt-BR",
                        JSONObject().put("kind", "scripture").put("passage", passage.copy(verse = start, verseEnd = end).encoded())
                            .put("editionId", passage.edition.id).put("workId", passage.workId).put("schemeId", passage.scheme)
                            .put("unitIds", org.json.JSONArray(units.map { it.text("id") })).put("editionMetadata", JSONObject(metadata)))
                }
                read(entry, enqueue)
            } catch (failure: Exception) { library.preferences.edit().putString("message", failure.message).apply() }
        }
    }
    suspend fun importTrack(uri: Uri): AudioTrack = withContext(Dispatchers.IO) { library.importTrack(uri) }
    fun toggle() { controller?.let { if (it.isPlaying) it.pause() else { if (it.playbackState == Player.STATE_ENDED) it.seekToDefaultPosition(0); it.play() } } }
    fun close() { controller?.removeListener(listener); MediaController.releaseFuture(future); scope.cancel() }
}
