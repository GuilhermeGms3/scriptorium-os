package org.scriptorium.app.audio

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

/** Private audio preferences/assets only. Never opens or migrates the book workspace. */
class AudioLibrary(private val context: Context) {
    val preferences = context.getSharedPreferences("scriptorium-audio-v1", Context.MODE_PRIVATE)
    val directory = File(context.filesDir, "audio").apply { mkdirs() }
    val speechDirectory = File(directory, "speech").apply { mkdirs() }
    private val musicDirectory = File(directory, "music").apply { mkdirs() }
    fun trackFile(id: String): File {
        require(id.matches(Regex("[a-f0-9]{64}")))
        return File(musicDirectory, id)
    }
    fun tracks(): List<AudioTrack> = objects(preferences.getString("tracks", "[]")!!).map(AudioTrack::parse)
    fun entries(): List<NarrationEntry> = objects(preferences.getString("entries", "[]")!!).map(NarrationEntry::parse)
    fun saveEntry(entry: NarrationEntry) = synchronized(lock) {
        val items = (listOf(entry) + entries().filter { it.id != entry.id }).sortedByDescending { isFavorite(it.id) }.take(30)
        preferences.edit().putString("entries", JSONArray(items.map { it.json() }).toString()).apply()
    }
    fun favorite(id: String) {
        val current = preferences.getStringSet("favorites", emptySet()).orEmpty().toMutableSet()
        if (id in current) current.remove(id) else { require(current.size < 20) { "Limite de 20 favoritos. Remova um antes de favoritar outra leitura." }; current.add(id) }
        preferences.edit().putStringSet("favorites", current).apply()
    }
    fun isFavorite(id: String): Boolean = id in preferences.getStringSet("favorites", emptySet()).orEmpty()
    fun renameTrack(id: String, title: String, category: String) = synchronized(lock) {
        require(title.isNotBlank() && title.length <= 150 && category.length <= 80)
        writeTracks(tracks().map { if (it.id == id) it.copy(title = title.trim(), category = category.trim()) else it })
    }
    fun removeTrack(id: String) = synchronized(lock) {
        val file = trackFile(id)
        require(!file.exists() || file.delete()) { "Não foi possível remover a cópia musical." }
        writeTracks(tracks().filter { it.id != id })
    }
    /** Caller uses IO; streaming copy, hash deduplication, no permanent source URI required. */
    fun importTrack(uri: Uri): AudioTrack = synchronized(lock) {
        val existing = tracks()
        val temporary = File.createTempFile("import-", ".part", musicDirectory)
        try {
            val digest = MessageDigest.getInstance("SHA-256")
            var bytes = 0L
            context.contentResolver.openInputStream(uri)?.use { input -> temporary.outputStream().use { output ->
                val buffer = ByteArray(65536)
                while (true) {
                    val count = input.read(buffer); if (count < 0) break
                    bytes += count
                    require(bytes <= 50L * 1024 * 1024) { "Máximo de 50 MiB por música." }
                    digest.update(buffer, 0, count); output.write(buffer, 0, count)
                }
            } } ?: error("Não foi possível ler o arquivo escolhido.")
            require(bytes > 44) { "Arquivo de áudio vazio ou inválido." }
            val id = digest.digest().joinToString("") { "%02x".format(it) }
            existing.find { it.id == id }?.takeIf { trackFile(id).exists() }?.let { return@synchronized it }
            require(existing.size < 100 || existing.any { it.id == id }) { "Limite de 100 músicas. Remova uma antes de importar." }
            require(existing.filter { it.id != id }.sumOf { it.bytes } + bytes <= 500L * 1024 * 1024) { "Biblioteca musical limitada a 500 MiB." }
            val retriever = MediaMetadataRetriever()
            val duration: Long
            val mime: String
            try {
                retriever.setDataSource(temporary.absolutePath)
                require(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes") { "O arquivo não contém áudio reconhecido." }
                require(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO) != "yes") { "Importe um arquivo de áudio, não um vídeo." }
                duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0
                mime = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE).orEmpty()
            } finally { retriever.release() }
            require(duration in 1..7200000 && mime in setOf("audio/mpeg", "audio/mp4", "audio/x-wav", "audio/wav", "audio/aac", "audio/flac", "audio/ogg", "application/ogg")) { "Formato/duração não suportados. Use MP3, WAV, M4A, AAC, FLAC ou OGG até duas horas." }
            val result = AudioTrack(id, "Minha música ${existing.size + 1}", "Pessoal", bytes, duration)
            require(temporary.renameTo(trackFile(id))) { "Não foi possível guardar a cópia local." }
            writeTracks((existing.filter { it.id != id } + result).take(100))
            result
        } finally { temporary.delete() }
    }
    private fun writeTracks(tracks: List<AudioTrack>) { preferences.edit().putString("tracks", JSONArray(tracks.map { it.json() }).toString()).apply() }
    companion object {
        private val lock = Any()
        fun objects(raw: String): List<JSONObject> { val array = JSONArray(raw); return (0 until array.length()).map { array.getJSONObject(it) } }
    }
}
