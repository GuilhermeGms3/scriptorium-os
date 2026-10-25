package org.scriptorium.app.data

import org.json.JSONObject
import org.scriptorium.app.content.Edition
import java.text.Normalizer
import java.time.LocalDate
import java.util.Locale

fun normalizedReading(value: String): String = Normalizer.normalize(value.lowercase(Locale.ROOT), Normalizer.Form.NFD)
    .replace(Regex("\\p{M}+"), "").replace(Regex("[^\\p{L}\\p{N}]"), "")

data class RequestedReference(val book: Row, val chapter: Int, val verse: Int?, val end: Int?)

data class ReadingBook(val edition: Edition, val row: Row)

/** The book catalogue is independent of the last passage's (possibly partial) edition. */
fun readingBookCatalog(editions: List<Pair<Edition, List<Row>>>): List<ReadingBook> = editions
    .sortedBy { if (it.first.id == "biblia-livre-n4-2025.1.0") 0 else 1 }
    .flatMap { (edition, books) -> books.map { ReadingBook(edition, it) } }
    .distinctBy { it.row.text("book_id") }

/** Navigation only: actual chapter/verse availability is checked against the selected edition. */
class ReadingNavigation(private val labels: JSONObject = JSONObject()) {
    fun discovery(): JSONObject? = labels.optJSONObject("discovery")?.let { JSONObject(it.toString()) }
    fun formation(id: String? = null): JSONObject? = labels.optJSONObject("formation")?.takeIf { id == null || it.optString("id") == id }?.let { JSONObject(it.toString()) }
    fun topic(id: String, fallback: String): String = labels.optJSONObject("topics")?.optString(id)?.takeIf(String::isNotBlank)
        ?: fallback.takeUnless { it == id || it.matches(Regex("^[a-z][a-z-]*:[^\\s]+$")) } ?: "Estudo temático"
    /** The site's Portuguese name for a code (claim kinds, review status, relations), from reading-labels.json. */
    fun term(group: String, code: String): String = labels.optJSONObject("vocabulary")?.optJSONObject(group)?.optString(code)?.takeIf(String::isNotBlank)
        ?: code.replace('-', ' ')
    fun lesson(id: String): JSONObject? = labels.optJSONObject("lessons")?.optJSONObject(id.removePrefix("lesson:"))
    fun lessonSupport(id: String): JSONObject? = lesson(id)?.optString("supportGuide")?.let { labels.optJSONObject("studyAreas")?.optJSONObject(it) }
    fun book(id: String): JSONObject? = labels.optJSONObject("books")?.optJSONObject(id)
    fun bookTitle(id: String, fallback: String): String = book(id)?.optString("title")?.takeIf(String::isNotBlank) ?: fallback
    fun workTitle(id: String, fallback: String): String = labels.optJSONObject("works")?.optString(id)?.takeIf(String::isNotBlank) ?: bookTitle(id.removePrefix("work:"), fallback)
    fun editionTitle(id: String, fallback: String): String = labels.optJSONObject("editions")?.optString(id)?.takeIf(String::isNotBlank) ?: fallback
    fun bookMatches(id: String, filter: String): Boolean = filter in listOf("Todos", "Bíblia") || filter in book(id)?.strings("tags").orEmpty()
    fun reference(bookId: String, fallback: String, chapter: Int, verse: Int?, end: Int? = null): String =
        "${bookTitle(bookId, fallback)} $chapter" + (verse?.let { ":$it" + if (end != null && end != it) "–$end" else "" } ?: "")
    fun group(id: String): String = book(id)?.optString("group")?.takeIf(String::isNotBlank) ?: "Deuterocanônicos e outros textos"
    fun symbol(id: String): String = book(id)?.optString("symbol")?.takeIf(String::isNotBlank) ?: "▤"
    fun parse(value: String, books: List<Row>): RequestedReference? {
        val match = Regex("^(.+?)\\s*(\\d{1,3})(?:\\s*[:.,]\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?$")
            .matchEntire(value.trim()) ?: return null
        val raw = match.groupValues[1].trim().replace(Regex("^III(?=\\s|[A-Za-zÀ-ÿ])", RegexOption.IGNORE_CASE), "3")
            .replace(Regex("^II(?=\\s|[A-Za-zÀ-ÿ])", RegexOption.IGNORE_CASE), "2")
            .replace(Regex("^I(?=\\s)", RegexOption.IGNORE_CASE), "1")
        val requested = normalizedReading(raw)
        // Portuguese Jo=João, Jn=Jonas, Jó=Jó. Removing accents must not turn Jo into Jó.
        val special = when (raw.lowercase(Locale.ROOT).replace(".", "")) { "jo" -> "john"; "jó" -> "job"; "jn" -> "jonah"; else -> null }
        val candidates = books.filter { row ->
            if (special != null) row.text("book_id") == special else {
                val aliases = book(row.text("book_id"))?.strings("aliases").orEmpty()
                (aliases + row.text("title") + row.text("book_id")).any {
                    val normalized = normalizedReading(it)
                    normalized == requested || (requested.length >= 3 && normalized.startsWith(requested))
                }
            }
        }.distinctBy { it.text("id") to it.text("scheme") }
        val row = candidates.singleOrNull() ?: return null
        val chapter = match.groupValues[2].toInt()
        val verse = match.groupValues[3].toIntOrNull()
        val end = match.groupValues[4].toIntOrNull()
        if (chapter !in 1..row.number("chapters") || verse == 0 || (end != null && (verse == null || end < verse))) return null
        return RequestedReference(row, chapter, verse, end)
    }
}

fun Passage.encoded(): String = JSONObject().put("edition", edition.id).put("work", workId).put("book", bookId)
    .put("title", title).put("chapter", chapter).put("scheme", scheme).put("verse", verse).put("end", verseEnd).toString()
fun decodePassage(raw: String?, editions: List<Edition>): Passage? = runCatching {
    if (raw.isNullOrBlank()) null else JSONObject(raw).let { json ->
        editions.find { it.id == json.getString("edition") }?.let { edition -> Passage(edition, json.getString("work"),
            json.getString("book"), json.getString("title"), json.getInt("chapter"), json.getString("scheme"),
            if (json.isNull("verse")) null else json.getInt("verse"), if (json.isNull("end")) null else json.getInt("end")) }
    }
}.getOrNull()

/** Derives a rotating daily chapter from available data, not a hardcoded verse list. */
fun dailyChapter(date: LocalDate, books: List<Row>): Pair<Row, Int>? {
    val total = books.sumOf { it.number("chapters").coerceAtLeast(0) }
    if (total == 0) return null
    var index = Math.floorMod(date.toEpochDay(), total.toLong()).toInt()
    for (book in books) { if (index < book.number("chapters")) return book to index + 1; index -= book.number("chapters") }
    return null
}

fun Row.commentCategories(): Set<String> {
    val payload = runCatching { JSONObject(text("payload_json")) }.getOrDefault(JSONObject())
    val type = payload.optJSONObject("contextualAnalysis")?.optString("contentType")
    return buildSet {
        if (payload.optString("referenceRole") == "proof-text" || normalizedReading(text("source_title")).contains("catecismo")) add("Catequese e confissão")
        when (type) {
            "exegetical-note", "exegetical-commentary", "textual-observation" -> add("Exegese")
            "source-commentary" -> add("Comentário bíblico")
            "theological-interpretation" -> add("Teologia")
            "historical-context" -> add("História e contexto")
            "methodological-guidance" -> add("Hermenêutica e método")
            "homiletical-application" -> add("Aplicação")
        }
        if (isEmpty()) add("Comentário da passagem")
    }
}

/** Addresses must agree explicitly; chapter context is included only when requested. */
fun commentApplies(passage: Passage, addresses: List<Row>, includeContext: Boolean = false): Boolean = addresses.any { target ->
    target.text("scheme_id") == passage.scheme && target.text("work_id") == passage.workId && target.text("book_id") == passage.bookId &&
        (target["chapter"] == null || target.number("chapter") == passage.chapter) &&
        when {
            target["verse_start"] == null -> includeContext
            passage.verse == null -> true
            else -> target.number("verse_start") <= (passage.verseEnd ?: passage.verse) &&
                target.number("verse_end").coerceAtLeast(target.number("verse_start")) >= passage.verse
        }
}
