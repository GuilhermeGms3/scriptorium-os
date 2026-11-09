package org.scriptorium.app.audio

import java.security.MessageDigest
import org.json.JSONObject
import java.util.Locale

/** Samsung may expose ISO-639-2 (por/spa); Google commonly uses ISO-639-1 (pt/es). */
private val isoLanguageAliases: Map<String, String> by lazy {
    Locale.getISOLanguages().mapNotNull { language ->
        runCatching { Locale.forLanguageTag(language).isO3Language to language }.getOrNull()
    }.toMap()
}
fun narrationLanguageCode(tag: String): String {
    val code = tag.replace('_', '-').substringBefore('-').lowercase(Locale.ROOT)
    return isoLanguageAliases[code] ?: code
}
fun voiceLanguageTag(locale: Locale, voiceName: String): String {
    val language = narrationLanguageCode(locale.language)
    val namedLocale = Regex("^([A-Za-z]{2,3})[-_]([A-Za-z]{2})(?:[-_]|$)").find(voiceName)
        ?.takeIf { narrationLanguageCode(it.groupValues[1]) == language }
    val region = locale.country.takeIf { it.matches(Regex("[A-Za-z]{2}")) }
        ?: namedLocale?.groupValues?.get(2)
    return language + (region?.uppercase(Locale.ROOT)?.let { "-$it" } ?: "")
}

enum class AudioMode(val label: String) { VOICE("Somente voz"), MIX("Voz + música"), MUSIC("Somente música") }

/** Literal UTF-16 slices. Directions and references never become spoken text. */
fun narrationSegments(text: String, limit: Int = 600): List<String> {
    require(text.isNotBlank() && text.length <= 30000) { "Escolha entre 1 e 30.000 caracteres por leitura." }
    require(limit in 2..2000)
    return buildList {
        var start = 0
        while (start < text.length) {
            var end = minOf(start + limit, text.length)
            if (end < text.length) {
                if (text[end - 1].isHighSurrogate() && text[end].isLowSurrogate()) end--
                val boundary = (start + (end - start) / 2 until end).lastOrNull { text[it] in ".!?;\n " }
                if (boundary != null) end = boundary + 1
            }
            add(text.substring(start, end)); start = end
        }
    }
}
fun audioHash(value: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(value).joinToString("") { "%02x".format(it) }
fun audioHash(value: String): String = audioHash(value.toByteArray(Charsets.UTF_8))

data class NarrationEntry(val id: String, val title: String, val text: String, val language: String, val source: JSONObject) {
    fun json(): JSONObject = JSONObject().put("version", 1).put("id", id).put("title", title).put("text", text).put("language", language).put("source", source)
    companion object {
        fun create(title: String, text: String, language: String, source: JSONObject): NarrationEntry {
            narrationSegments(text)
            require(title.isNotBlank() && title.length <= 300 && language.length in 2..30)
            require(source.toString().length <= 20000)
            val hash = audioHash("literal-android-v1\u0000$language\u0000${source}\u0000$text")
            return NarrationEntry(hash, title, text, language, source)
        }
        fun parse(json: JSONObject): NarrationEntry {
            require(json.getInt("version") == 1)
            val entry = create(json.getString("title"), json.getString("text"), json.getString("language"), json.getJSONObject("source"))
            require(entry.id == json.getString("id")) { "A leitura mudou; prepare-a novamente na fonte." }
            return entry
        }
    }
}

data class AudioTrack(val id: String, val title: String, val category: String, val bytes: Long, val durationMs: Long) {
    fun json(): JSONObject = JSONObject().put("id", id).put("title", title).put("category", category).put("bytes", bytes).put("durationMs", durationMs)
    companion object {
        fun parse(j: JSONObject) = AudioTrack(j.getString("id"), j.getString("title"), j.getString("category"), j.getLong("bytes"), j.getLong("durationMs"))
    }
}
