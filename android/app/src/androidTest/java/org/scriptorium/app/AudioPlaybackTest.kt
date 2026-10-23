package org.scriptorium.app

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import androidx.media3.session.SessionToken
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.scriptorium.app.audio.*
import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.data.*
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.TimeUnit

/** Opt-in: emits real local speech and a temporary low-volume WAV, never clears books/notes. */
@RunWith(AndroidJUnit4::class)
class AudioPlaybackTest {
    @Test fun realSpeechMusicBackgroundAndPersistentProgress() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("audioQa") == "true")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val library = AudioLibrary(context)
        val previous = mapOf("mode" to library.preferences.getString("mode", "VOICE"), "track" to library.preferences.getString("track", ""))
        val wav = File(context.cacheDir, "audio-qa.wav")
        val samples = 22050 * 40
        val bytes = ByteBuffer.allocate(44 + samples * 2).order(ByteOrder.LITTLE_ENDIAN)
        bytes.put("RIFF".toByteArray()).putInt(36 + samples * 2).put("WAVEfmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(22050).putInt(44100).putShort(2).putShort(16).put("data".toByteArray()).putInt(samples * 2)
        repeat(samples) { bytes.putShort((kotlin.math.sin(it * 2.0 * Math.PI * 220 / 22050) * 70).toInt().toShort()) }
        wav.writeBytes(bytes.array())
        val track = library.importTrack(Uri.fromFile(wav))
        var controller: MediaController? = null
        try {
            assertEquals(track.id, library.importTrack(Uri.fromFile(wav)).id)
            library.renameTrack(track.id, "Sinal temporário de QA", "Teste técnico")
            val future = withContext(Dispatchers.Main) { MediaController.Builder(context, SessionToken(context, ComponentName(context, ScriptoriumAudioService::class.java))).buildAsync() }
            controller = withContext(Dispatchers.IO) { future.get(20, TimeUnit.SECONDS) }
            val player = requireNotNull(controller)
            suspend fun command(action: String, extras: Bundle = Bundle()): SessionResult {
                extras.putString("action", action)
                val result = withContext(Dispatchers.Main) { player.sendCustomCommand(SessionCommand(ScriptoriumAudioService.COMMAND, Bundle.EMPTY), extras) }
                return withContext(Dispatchers.IO) { result.get(120, TimeUnit.SECONDS) }
            }
            assertEquals(SessionResult.RESULT_SUCCESS, command("settings", Bundle().apply { putString("track", track.id); putString("mode", "MIX"); putString("voice", ""); putFloat("volume", 0.35f); putFloat("musicVolume", 0.1f); putFloat("rate", 1f) }).resultCode)
            val store = ContentPackageStore(File(context.filesDir, "content"), { File(context.filesDir, "active-content").readText() }, { error("QA não ativa pacotes") }, Sqlite::validate)
            val repository = MobileRepository(store)
            val edition = repository.editions().single { it.id == "biblia-livre-n4-2025.1.0" }
            val passage = Passage(edition, "work:genesis", "genesis", "Gênesis", 1, "scriptorium-bcv-1")
            val offset = InstrumentationRegistry.getArguments().getString("verseOffset")?.toIntOrNull()?.coerceIn(0, 23) ?: 0
            val verses = repository.verses(passage).drop(offset).take(8)
            assertTrue(verses.isNotEmpty())
            val entry = NarrationEntry.create("Gênesis 1 · QA real", verses.joinToString("\n") { it.text("surface_text") }, "pt-BR", JSONObject().put("kind", "scripture").put("editionId", edition.id).put("passage", passage.encoded()).put("schemeId", passage.scheme))
            val readingResult = command("read", Bundle().apply { putString("entry", entry.json().toString()) })
            assertEquals(library.preferences.getString("message", "Falha sem mensagem"), SessionResult.RESULT_SUCCESS, readingResult.resultCode)
            withTimeout(20000) { while (!withContext(Dispatchers.Main) { player.isPlaying }) delay(100) }
            assertEquals(0.35f, withContext(Dispatchers.Main) { player.volume }, 0.01f)
            // Leave the app; audio remains owned by the session, not an Activity.
            context.startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            delay(4000)
            assertTrue(withContext(Dispatchers.Main) { player.isPlaying })
            assertTrue(command("status").extras.getBoolean("musicPlaying"))
            assertTrue(library.preferences.contains("progress:${entry.id}"))
            fun shell(command: String): String = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command).use { descriptor ->
                android.os.ParcelFileDescriptor.AutoCloseInputStream(descriptor).use { it.readBytes().decodeToString() }
            }
            assertTrue(shell("dumpsys media_session").contains("org.scriptorium.app"))
            if (InstrumentationRegistry.getArguments().getString("screenOffQa") == "true") {
                try {
                    shell("input keyevent KEYCODE_SLEEP"); delay(1500)
                    assertTrue(withContext(Dispatchers.Main) { player.isPlaying })
                } finally { shell("input keyevent KEYCODE_WAKEUP") }
            }
            val audioManager = context.getSystemService(android.content.Context.AUDIO_SERVICE) as android.media.AudioManager
            val focus = android.media.AudioFocusRequest.Builder(android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_MEDIA).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH).build())
                .setOnAudioFocusChangeListener({ }, android.os.Handler(android.os.Looper.getMainLooper())).build()
            try {
                assertEquals(android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED, audioManager.requestAudioFocus(focus))
                delay(500)
                assertFalse(withContext(Dispatchers.Main) { player.isPlaying })
                assertFalse(command("status").extras.getBoolean("musicPlaying"))
            } finally { audioManager.abandonAudioFocusRequest(focus) }
            withTimeout(5000) { while (!withContext(Dispatchers.Main) { player.isPlaying }) delay(100) }
            shell("input keyevent KEYCODE_MEDIA_PAUSE")
            delay(300)
            assertFalse(withContext(Dispatchers.Main) { player.isPlaying })
            val position = withContext(Dispatchers.Main) { player.currentPosition }
            delay(700)
            assertEquals(position, withContext(Dispatchers.Main) { player.currentPosition })
            assertFalse(command("status").extras.getBoolean("musicPlaying"))
            assertEquals(SessionResult.RESULT_SUCCESS, command("settings", Bundle().apply { putFloat("rate", 1.25f); putFloat("musicVolume", 0.05f) }).resultCode)
            assertEquals(1.25f, withContext(Dispatchers.Main) { player.playbackParameters.speed }, 0.01f)
            assertEquals(SessionResult.RESULT_SUCCESS, command("settings", Bundle().apply { putString("mode", "MUSIC") }).resultCode)
            withContext(Dispatchers.Main) { player.play() }; delay(500)
            assertTrue(withContext(Dispatchers.Main) { player.currentMediaItem?.mediaId?.startsWith("music:") == true })
            assertEquals(SessionResult.RESULT_SUCCESS, command("settings", Bundle().apply { putString("mode", "VOICE") }).resultCode)
            assertTrue(withContext(Dispatchers.Main) { player.currentMediaItem?.mediaId?.startsWith(entry.id) == true })
            assertFalse("Uma voz pausada manualmente não deve retomar apenas por trocar o modo", withContext(Dispatchers.Main) { player.playWhenReady })
            val cached = library.speechDirectory.listFiles().orEmpty().filter { it.extension == "wav" }.associate { it.name to it.lastModified() }
            assertTrue(cached.isNotEmpty())
            assertEquals(SessionResult.RESULT_SUCCESS, command("read", Bundle().apply { putString("entry", entry.json().toString()); putBoolean("resume", true) }).resultCode)
            assertEquals(cached, library.speechDirectory.listFiles().orEmpty().filter { it.extension == "wav" }.associate { it.name to it.lastModified() })
            assertEquals(SessionResult.RESULT_SUCCESS, command("close").resultCode)
            assertFalse(withContext(Dispatchers.Main) { player.isPlaying })
            assertEquals(0, withContext(Dispatchers.Main) { player.mediaItemCount })
            val unsupported = NarrationEntry.create("Idioma inexistente", "Texto de teste.", "zz", JSONObject().put("kind", "personal"))
            assertNotEquals(SessionResult.RESULT_SUCCESS, command("read", Bundle().apply { putString("entry", unsupported.json().toString()) }).resultCode)
            assertFalse(library.preferences.getBoolean("busy", true))
        } finally {
            controller?.let { player ->
                val cleanup = withContext(Dispatchers.Main) {
                    player.pause()
                    player.sendCustomCommand(SessionCommand(ScriptoriumAudioService.COMMAND, Bundle.EMPTY), Bundle().apply { putString("action", "removeTrack"); putString("track", track.id) })
                }
                withContext(Dispatchers.IO) { cleanup.get(10, TimeUnit.SECONDS) }
                val dismiss = withContext(Dispatchers.Main) { player.sendCustomCommand(SessionCommand(ScriptoriumAudioService.COMMAND, Bundle.EMPTY), Bundle().apply { putString("action", "dismiss") }) }
                withContext(Dispatchers.IO) { dismiss.get(10, TimeUnit.SECONDS) }
                withContext(Dispatchers.Main) { player.release() }
            }
            library.preferences.edit().putString("mode", previous["mode"]).putString("track", previous["track"]).apply()
            library.removeTrack(track.id); wav.delete()
        }
    }
}
