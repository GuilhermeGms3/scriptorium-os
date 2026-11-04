package org.scriptorium.app.data

import java.net.URI
import java.net.URL
import java.net.HttpURLConnection
import java.net.URLEncoder
import org.json.JSONObject

fun safeExternalUrl(value: String): String? = try {
    val uri = URI(value)
    val host = uri.host?.lowercase().orEmpty()
    if (uri.scheme != "https" || uri.userInfo != null || host.isEmpty() || host == "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.contains(':') || host.matches(Regex("[0-9.]+")) || value.length > 4096) null else uri.toASCIIString()
} catch (_: Exception) { null }

object ExternalResearch {
    private fun encode(value: String) = URLEncoder.encode(value, "UTF-8")
    fun links(query: String): List<Pair<String, String>> = listOf(
        "Google" to "https://www.google.com/search?q=${encode(query)}",
        "Google Acadêmico" to "https://scholar.google.com/scholar?q=${encode(query)}",
        "SciELO" to "https://search.scielo.org/?q=${encode(query)}",
        "BDTD" to "https://bdtd.ibict.br/vufind/Search/Results?lookfor=${encode(query)}&type=AllFields",
        "USP · via Google" to "https://www.google.com/search?q=${encode("site:teses.usp.br $query")}",
        "UnB · via Google" to "https://www.google.com/search?q=${encode("site:repositorio.unb.br $query")}",
        "Harvard · via Google" to "https://www.google.com/search?q=${encode("site:dash.harvard.edu $query")}",
        "Frankfurt · via Google" to "https://www.google.com/search?q=${encode("site:publikationen.ub.uni-frankfurt.de $query")}",
        "Internet Archive" to "https://archive.org/search?query=${encode(query)}",
    )
    fun academic(query: String, language: String = "all", openOnly: Boolean = false, page: Int = 1): List<Row> {
        require(query.trim().length in 2..240 && language in listOf("all", "pt", "en", "es") && page in 1..10)
        val filters = listOfNotNull(if (language != "all") "language:$language" else null, if (openOnly) "is_oa:true" else null).joinToString(",")
        val url = URL("https://api.openalex.org/works?search=${encode(query.trim())}&page=$page&per_page=10&select=id,display_name,doi,publication_year,language,type,authorships,primary_location,open_access${if (filters.isNotEmpty()) "&filter=${encode(filters)}" else ""}")
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 10_000; connection.readTimeout = 15_000; connection.instanceFollowRedirects = false
        connection.setRequestProperty("Accept", "application/json")
        try {
            require(connection.responseCode !in listOf(401, 403, 429)) { "O OpenAlex limitou a consulta. Tente mais tarde ou use os atalhos externos." }
            require(connection.responseCode == 200) { "Catálogo acadêmico indisponível." }
            val raw = connection.inputStream.bufferedReader().use { reader ->
                val result = StringBuilder(); val buffer = CharArray(8192)
                while (true) { val size = reader.read(buffer); if (size < 0) break; require(result.length + size <= 2_000_000) { "Resposta acadêmica excessivamente grande." }; result.append(buffer, 0, size) }
                result.toString()
            }
            return JSONObject(raw).objects("results").mapNotNull { work ->
                val id = work.optString("id")
                if (!id.matches(Regex("https://openalex.org/W[0-9]+"))) return@mapNotNull null
                mapOf("id" to id, "title" to work.optString("display_name"), "year" to work.optString("publication_year"), "language" to work.optString("language"), "doi" to work.optString("doi"),
                    "authors" to work.objects("authorships").take(12).joinToString(", ") { it.optJSONObject("author")?.optString("display_name").orEmpty() },
                    "url" to (safeExternalUrl(work.optJSONObject("primary_location")?.optString("landing_page_url").orEmpty()) ?: id), "payload_json" to work.toString())
            }
        } finally { connection.disconnect() }
    }
}
