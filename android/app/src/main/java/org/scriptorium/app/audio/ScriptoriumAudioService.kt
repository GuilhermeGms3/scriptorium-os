package org.scriptorium.app.audio

import android.app.PendingIntent
import android.content.Intent
import android.os.Bundle
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import androidx.media3.session.SessionError
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.scriptorium.app.MainActivity
import java.io.File

/** One session and one owner of audio focus. The internal ambience channel never requests it. */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class ScriptoriumAudioService : MediaSessionService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var library: AudioLibrary
    private lateinit var narrator: NativeNarrator
    private lateinit var voice: ExoPlayer
    private lateinit var music: ExoPlayer
    private var session: MediaSession? = null
    private var generation: Job? = null
    private var mode = AudioMode.VOICE
    private var selectedTrack = ""
    private var shuttingDown = false

    override fun onCreate() {
        super.onCreate()
        library = AudioLibrary(this)
        if (library.preferences.getBoolean("busy", false)) library.preferences.edit().putBoolean("busy", false).putString("message", "A preparação anterior foi interrompida. Repita a leitura para reutilizar os segmentos já prontos.").apply()
        narrator = NativeNarrator(this, library)
        val attributes = AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build()
        voice = ExoPlayer.Builder(this).setAudioAttributes(attributes, true).setHandleAudioBecomingNoisy(true).build()
        voice.setWakeMode(C.WAKE_MODE_LOCAL)
        music = ExoPlayer.Builder(this).setAudioAttributes(attributes, false).build()
        voice.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) { syncAmbience(); saveProgress() }
            override fun onPlaybackSuppressionReasonChanged(playbackSuppressionReason: Int) { syncAmbience() }
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) { saveProgress() }
            override fun onPlayerError(error: PlaybackException) { message("Não foi possível reproduzir este áudio. ${error.errorCodeName}"); music.pause() }
        })
        music.addListener(object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) { message("Trilha indisponível ou não decodificável. Importe outro arquivo.") }
        })
        val launch = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        session = MediaSession.Builder(this, voice).setSessionActivity(launch).setCallback(object : MediaSession.Callback {
            override fun onConnect(session: MediaSession, controller: MediaSession.ControllerInfo): MediaSession.ConnectionResult {
                val own = controller.packageName == packageName
                val commands = MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                if (own) commands.add(SessionCommand(COMMAND, Bundle.EMPTY))
                val playerCommands = MediaSession.ConnectionResult.DEFAULT_PLAYER_COMMANDS.buildUpon()
                // Other apps may operate transport, never inject network/file playback sources.
                if (!own) playerCommands.remove(Player.COMMAND_CHANGE_MEDIA_ITEMS)
                return MediaSession.ConnectionResult.AcceptedResultBuilder(session)
                    .setAvailableSessionCommands(commands.build()).setAvailablePlayerCommands(playerCommands.build()).build()
            }
            override fun onCustomCommand(session: MediaSession, controller: MediaSession.ControllerInfo, customCommand: SessionCommand, args: Bundle): ListenableFuture<SessionResult> {
                if (controller.packageName != packageName || customCommand.customAction != COMMAND)
                    return Futures.immediateFuture(SessionResult(SessionError.ERROR_PERMISSION_DENIED))
                val result = SettableFuture.create<SessionResult>()
                scope.launch {
                    try {
                        when (args.getString("action")) {
                            "read" -> {
                                require(generation?.isActive != true) { "Há uma leitura sendo preparada. Aguarde ou cancele." }
                                val entry = NarrationEntry.parse(JSONObject(requireNotNull(args.getString("entry"))))
                                if (entry.source.optString("kind") == "reflection") {
                                    require(entry.source.optBoolean("reviewed")) { "Revise o roteiro antes de narrar." }
                                    val track = entry.source.optString("musicTrack").takeIf { id -> library.tracks().any { it.id == id } }.orEmpty()
                                    library.preferences.edit().putString("track", track).putFloat("musicVolume", entry.source.optDouble("musicVolume", 0.2).toFloat().coerceIn(0f, 1f)).apply()
                                    switchMode(if (track.isBlank()) AudioMode.VOICE else AudioMode.MIX)
                                }
                                require(mode != AudioMode.MUSIC) { "Escolha Somente voz ou Voz + música para narrar." }
                                generation = launch {
                                    try {
                                        library.preferences.edit().putBoolean("busy", true).putString("message", "Preparando voz local…").apply()
                                        val files = narrator.render(entry.text, entry.language, library.preferences.getString("voice", "").orEmpty())
                                        val items = files.mapIndexed { index, file -> narrationItem(entry, file, index) }
                                        require(items.size + (if (args.getBoolean("enqueue")) voice.mediaItemCount else 0) <= 300) { "Fila limitada a 300 segmentos; limpe-a antes de adicionar mais leituras." }
                                        withContext(Dispatchers.IO) { library.saveEntry(entry) }
                                        if (args.getBoolean("enqueue") && voice.mediaItemCount > 0) voice.addMediaItems(items)
                                        else {
                                            saveProgress()
                                            val progress = if (args.getBoolean("resume")) JSONObject(library.preferences.getString("progress:${entry.id}", "{}")!!) else JSONObject()
                                            val segment = if (progress.optBoolean("completed")) 0 else progress.optInt("segment").coerceIn(0, items.lastIndex)
                                            val sameVoice = progress.optString("voiceFingerprint") == files[segment].nameWithoutExtension
                                            voice.setMediaItems(items, segment, if (sameVoice && !progress.optBoolean("completed")) progress.optLong("position").coerceAtLeast(0) else 0)
                                            voice.prepare(); voice.play()
                                        }
                                        saveQueue(); message(null)
                                        result.set(SessionResult(SessionResult.RESULT_SUCCESS))
                                    } catch (cancelled: CancellationException) { result.set(SessionResult(SessionError.INFO_CANCELLED)); throw cancelled }
                                    catch (failure: Exception) { message(failure.message); result.set(SessionResult(SessionError.ERROR_UNKNOWN)) }
                                    finally { library.preferences.edit().putBoolean("busy", false).apply() }
                                }
                                return@launch
                            }
                            "cancel" -> { generation?.cancelAndJoin(); library.preferences.edit().putBoolean("busy", false).apply(); message("Preparação cancelada. O conteúdo anterior foi mantido.") }
                            "settings" -> {
                                val next = args.getString("mode")?.let(AudioMode::valueOf) ?: mode
                                if (next != mode) switchMode(next)
                                val editor = library.preferences.edit()
                                if (args.containsKey("rate")) editor.putFloat("rate", args.getFloat("rate").coerceIn(0.5f, 2f))
                                if (args.containsKey("volume")) editor.putFloat("volume", args.getFloat("volume").coerceIn(0f, 1f))
                                if (args.containsKey("musicVolume")) editor.putFloat("musicVolume", args.getFloat("musicVolume").coerceIn(0f, 1f))
                                if (args.containsKey("loop")) editor.putBoolean("loop", args.getBoolean("loop"))
                                if (args.containsKey("voice")) editor.putString("voice", args.getString("voice").orEmpty().take(500))
                                if (args.containsKey("track")) editor.putString("track", args.getString("track").orEmpty())
                                editor.apply(); applySettings()
                            }
                            "removeTrack" -> {
                                val id = requireNotNull(args.getString("track"))
                                if (selectedTrack == id) {
                                    music.stop(); music.clearMediaItems()
                                    if (mode == AudioMode.MUSIC) { voice.stop(); voice.clearMediaItems() }
                                    selectedTrack = ""; library.preferences.edit().remove("track").apply()
                                }
                                withContext(Dispatchers.IO) { library.removeTrack(id) }
                            }
                            "clearQueue" -> { closePlayback(); voice.clearMediaItems(); saveQueue() }
                            "close" -> { closePlayback(); voice.clearMediaItems(); saveQueue() }
                            "dismiss" -> message(null)
                            "clearCache" -> {
                                generation?.cancelAndJoin()
                                closePlayback(); voice.clearMediaItems(); saveQueue()
                                library.preferences.edit().remove("voiceQueue").apply()
                                withContext(Dispatchers.IO) { library.speechDirectory.listFiles().orEmpty().forEach { require(it.delete()) { "Não foi possível limpar um arquivo de voz." } } }
                            }
                            "status" -> {
                                result.set(SessionResult(SessionResult.RESULT_SUCCESS, Bundle().apply {
                                    putBoolean("voicePlaying", voice.isPlaying); putBoolean("musicPlaying", music.isPlaying)
                                    putString("mode", mode.name); putFloat("musicVolume", music.volume)
                                }))
                                return@launch
                            }
                            else -> error("Comando de áudio desconhecido.")
                        }
                        result.set(SessionResult(SessionResult.RESULT_SUCCESS))
                    } catch (failure: Exception) { message(failure.message); result.set(SessionResult(SessionError.ERROR_UNKNOWN)) }
                }
                return result
            }
        }).build()
        scope.launch {
            try {
                val voices = narrator.voices().map { JSONObject().put("id", it.id).put("label", it.label).put("language", it.language) }
                library.preferences.edit().putString("voices", JSONArray(voices).toString()).apply()
            } catch (failure: Exception) { message(failure.message) }
        }
        scope.launch {
            try {
                val saved = withContext(Dispatchers.IO) { library.preferences.getString("queue", "[]").orEmpty() }
                val items = decodeQueue(saved)
                if (items.isNotEmpty()) {
                    voice.setMediaItems(items, library.preferences.getInt("queueIndex", 0).coerceIn(0, items.lastIndex), library.preferences.getLong("queuePosition", 0).coerceAtLeast(0))
                    voice.prepare() // Explicit user action is required to play after a restart.
                }
                mode = AudioMode.valueOf(library.preferences.getString("mode", AudioMode.VOICE.name)!!)
                applySettings()
            } catch (failure: Exception) { message("Não foi possível restaurar a fila. ${failure.message.orEmpty()}") }
            while (isActive) { delay(3000); saveProgress() }
        }
    }
    private fun narrationItem(entry: NarrationEntry, file: File, ordinal: Int): MediaItem = MediaItem.Builder()
        .setMediaId("${entry.id}:$ordinal").setUri(file.toURI().toString())
        .setMediaMetadata(MediaMetadata.Builder().setTitle(entry.title).setArtist("Scriptorium · voz local")
            .setExtras(Bundle().apply { putString("entryId", entry.id); putInt("segment", ordinal); putString("voiceFingerprint", file.nameWithoutExtension) }).build()).build()

    private fun trackItem(track: AudioTrack) = MediaItem.Builder().setMediaId("music:${track.id}").setUri(library.trackFile(track.id).toURI().toString())
        .setMediaMetadata(MediaMetadata.Builder().setTitle(track.title).setArtist("Música pessoal · ${track.category}").build()).build()

    private fun switchMode(next: AudioMode) {
        var resume = voice.playWhenReady
        saveProgress()
        if (next == AudioMode.MUSIC) {
            require(library.tracks().any { it.id == library.preferences.getString("track", "") }) { "Importe e selecione uma música primeiro." }
            library.preferences.edit().putString("voiceQueue", encodeQueue()).putInt("voiceIndex", voice.currentMediaItemIndex.coerceAtLeast(0)).putLong("voicePosition", voice.currentPosition).putBoolean("voiceResumeAfterMusic", resume).apply()
            voice.pause(); voice.clearMediaItems()
        } else if (mode == AudioMode.MUSIC) {
            resume = resume && library.preferences.getBoolean("voiceResumeAfterMusic", false)
            val items = decodeQueue(library.preferences.getString("voiceQueue", "[]")!!)
            voice.pause(); voice.clearMediaItems()
            if (items.isNotEmpty()) { voice.setMediaItems(items, library.preferences.getInt("voiceIndex", 0).coerceIn(0, items.lastIndex), library.preferences.getLong("voicePosition", 0)); voice.prepare() }
        }
        mode = next; selectedTrack = ""
        library.preferences.edit().putString("mode", next.name).apply()
        applySettings()
        saveQueue()
        if (resume && voice.mediaItemCount > 0) voice.play()
    }
    private fun applySettings() {
        val prefs = library.preferences
        voice.volume = prefs.getFloat(if (mode == AudioMode.MUSIC) "musicVolume" else "volume", if (mode == AudioMode.MUSIC) 0.2f else 1f)
        voice.setPlaybackSpeed(if (mode == AudioMode.MUSIC) 1f else prefs.getFloat("rate", 1f))
        music.volume = prefs.getFloat("musicVolume", 0.2f)
        music.repeatMode = if (prefs.getBoolean("loop", true)) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
        voice.repeatMode = if (mode == AudioMode.MUSIC && prefs.getBoolean("loop", true)) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
        val trackId = prefs.getString("track", "").orEmpty()
        if (trackId != selectedTrack) {
            val track = library.tracks().find { it.id == trackId }
            music.pause(); music.clearMediaItems()
            if (track != null) {
                if (mode == AudioMode.MUSIC && voice.currentMediaItem?.mediaId != "music:${track.id}") { val playing = voice.playWhenReady; voice.setMediaItem(trackItem(track)); voice.prepare(); voice.playWhenReady = playing }
                else { music.setMediaItem(trackItem(track)); music.prepare() }
            }
            selectedTrack = trackId
        }
        syncAmbience()
    }
    private fun syncAmbience() {
        if (mode == AudioMode.MIX && voice.isPlaying && voice.playbackSuppressionReason == Player.PLAYBACK_SUPPRESSION_REASON_NONE && music.mediaItemCount > 0) music.play() else music.pause()
    }
    private fun closePlayback() { generation?.cancel(); saveProgress(); voice.pause(); music.pause(); message(null) }
    private fun message(value: String?) { library.preferences.edit().putString("message", value).apply() }
    private fun encodeQueue(): String = JSONArray((0 until voice.mediaItemCount).map { index ->
        val item = voice.getMediaItemAt(index)
        JSONObject().put("id", item.mediaId).put("uri", item.localConfiguration?.uri.toString()).put("title", item.mediaMetadata.title)
            .put("entryId", item.mediaMetadata.extras?.getString("entryId")).put("segment", item.mediaMetadata.extras?.getInt("segment", 0)).put("voiceFingerprint", item.mediaMetadata.extras?.getString("voiceFingerprint"))
    }).toString()
    private fun decodeQueue(raw: String): List<MediaItem> = AudioLibrary.objects(raw).take(300).mapNotNull { item ->
        val uri = java.net.URI(item.getString("uri"))
        require(uri.scheme == "file") { "A fila deve conter somente arquivos locais privados." }
        val file = File(uri).canonicalFile
        require(file.toPath().startsWith(library.directory.canonicalFile.toPath()))
        if (!file.isFile) null else MediaItem.Builder().setMediaId(item.getString("id")).setUri(file.toURI().toString())
            .setMediaMetadata(MediaMetadata.Builder().setTitle(item.optString("title")).setArtist("Scriptorium")
                .setExtras(Bundle().apply { putString("entryId", item.optString("entryId")); putInt("segment", item.optInt("segment")); putString("voiceFingerprint", item.optString("voiceFingerprint")) }).build()).build()
    }
    private fun saveQueue() { library.preferences.edit().putString("queue", encodeQueue()).apply(); saveProgress() }
    private fun saveProgress() {
        if (!::voice.isInitialized || shuttingDown || voice.mediaItemCount == 0) return
        val editor = library.preferences.edit().putInt("queueIndex", voice.currentMediaItemIndex.coerceAtLeast(0)).putLong("queuePosition", voice.currentPosition.coerceAtLeast(0))
        voice.currentMediaItem?.mediaMetadata?.extras?.let { extras ->
            val id = extras.getString("entryId").orEmpty()
            if (id.isNotEmpty()) editor.putString("progress:$id", JSONObject().put("segment", extras.getInt("segment")).put("position", voice.currentPosition.coerceAtLeast(0)).put("voiceFingerprint", extras.getString("voiceFingerprint")).put("completed", voice.playbackState == Player.STATE_ENDED).put("updatedAt", System.currentTimeMillis()).toString())
        }
        editor.apply()
    }
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? =
        if (controllerInfo.packageName == packageName || controllerInfo.isTrusted) session else null
    override fun onDestroy() {
        saveProgress(); shuttingDown = true; scope.cancel(); narrator.close(); music.release(); voice.release(); session?.release(); session = null
        super.onDestroy()
    }
    companion object { const val COMMAND = "org.scriptorium.app.AUDIO" }
}
