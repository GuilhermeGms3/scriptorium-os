package org.scriptorium.app.data

import org.json.JSONObject
import org.json.JSONArray
import org.scriptorium.app.content.Edition
import java.text.Normalizer
import java.time.LocalDate
import java.util.Locale

fun normalizedReading(value: String): String = Normalizer.normalize(value.lowercase(Locale.ROOT), Normalizer.Form.NFD)
    .replace(Regex("\\p{M}+"), "").replace(Regex("[^\\p{L}\\p{N}]"), "")

private val referencePattern = Regex("^(.+?)\\s*(\\d{1,3})(?:(?:\\s*[:.,]\\s*|\\s+)(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?$")

/** The same input drives catalogue filtering and passage navigation. */
fun referenceBookName(value: String): String = referencePattern.matchEntire(value.trim())?.groupValues?.get(1)?.trim() ?: value.trim()
fun isReadingReference(value: String): Boolean = referencePattern.matches(value.trim())

/** Adjacent transpositions count as a single typo, like a missed or extra letter. */
private fun bookNameDistance(left: String, right: String): Int {
    val matrix = Array(left.length + 1) { IntArray(right.length + 1) }
    for (i in 0..left.length) matrix[i][0] = i
    for (j in 0..right.length) matrix[0][j] = j
    for (i in 1..left.length) for (j in 1..right.length) {
        matrix[i][j] = minOf(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + if (left[i - 1] == right[j - 1]) 0 else 1)
        if (i > 1 && j > 1 && left[i - 1] == right[j - 2] && left[i - 2] == right[j - 1])
            matrix[i][j] = minOf(matrix[i][j], matrix[i - 2][j - 2] + 1)
    }
    return matrix[left.length][right.length]
}

data class RequestedReference(val book: Row, val chapter: Int, val verse: Int?, val end: Int?)

data class ReadingBook(val edition: Edition, val row: Row)

/** The book catalogue is independent of the last passage's (possibly partial) edition. */
fun readingBookCatalog(editions: List<Pair<Edition, List<Row>>>): List<ReadingBook> = editions
    .sortedBy { if (it.first.id == "biblia-livre-n4-2025.1.0") 0 else 1 }
    .flatMap { (edition, books) -> books.map { ReadingBook(edition, it) } }
    .distinctBy { it.row.text("book_id") }

/** Navigation only: actual chapter/verse availability is checked against the selected edition. */
class ReadingNavigation(private val labels: JSONObject = JSONObject()) {
    fun studyTree(): JSONObject? = labels.optJSONObject("studyTree")?.let { JSONObject(it.toString()) }
    fun editorialLesson(id: String): JSONObject? {
        if (!id.startsWith("lesson:")) return null
        val content = labels.optJSONObject("studyContent") ?: return null
        val lesson = content.optJSONObject("lessons")?.optJSONObject(id.removePrefix("lesson:")) ?: return null
        val chapters = content.optJSONObject("chapters") ?: return null
        val resolved = lesson.strings("chapterIds").map { key -> chapters.optJSONObject(key) ?: return null }
        return JSONObject().put("title", lesson.getString("title")).put("chapters", JSONArray(resolved.map { JSONObject(it.toString()) }))
    }
    fun editorialCourse(id: String): JSONObject? = labels.optJSONObject("studyContent")?.optJSONObject("courses")?.optJSONObject(id)?.let { JSONObject(it.toString()) }
    fun editorialCourses(): List<JSONObject> = labels.optJSONObject("studyContent")?.optJSONObject("courses")?.let { courses ->
        // Catalog keys identify routes; legacy payload IDs still identify saved course progress.
        courses.keys().asSequence().mapNotNull { key -> editorialCourse(key)?.put("id", key) }.toList()
    }.orEmpty()
    fun lessonReferences(): List<JSONObject> = labels.optJSONObject("studyContent")?.objects("references").orEmpty()
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
    private fun aliases(row: Row): List<String> = book(row.text("book_id"))?.strings("aliases").orEmpty() +
        bookTitle(row.text("book_id"), row.text("title")) + row.text("title") + row.text("book_id")

    private fun romanBookName(value: String): String = value
        .replace(Regex("^III(?=\\s|[A-Za-zÀ-ÿ])", RegexOption.IGNORE_CASE), "3")
        .replace(Regex("^II(?=\\s|[A-Za-zÀ-ÿ])", RegexOption.IGNORE_CASE), "2")
        .replace(Regex("^I(?=\\s)", RegexOption.IGNORE_CASE), "1")

    private fun specialBook(raw: String): String? = when (raw.lowercase(Locale.ROOT).replace(".", "")) {
        "jo" -> "john"; "jó" -> "job"; "jn" -> "jonah"; else -> null
    }

    fun matchesBookQuery(row: Row, value: String): Boolean {
        val raw = romanBookName(referenceBookName(value))
        if (raw.isBlank()) return true
        specialBook(raw)?.let { return row.text("book_id") == it }
        val requested = normalizedReading(raw)
        return aliases(row).any {
            val name = normalizedReading(it)
            name.contains(requested) || typoDistance(requested, name) != null
        }
    }

    private fun typoDistance(requested: String, name: String): Int? {
        // Never autocorrect short abbreviations or change numbered books.
        if (requested.length < 4 || name.length < 4 || requested.first().isDigit() != name.first().isDigit() ||
            (requested.first().isDigit() && requested.first() != name.first())) return null
        val limit = if (requested.length >= 8) 2 else 1
        if (kotlin.math.abs(requested.length - name.length) > limit) return null
        return bookNameDistance(requested, name).takeIf { it <= limit }
    }

    fun parse(value: String, books: List<Row>): RequestedReference? {
        val match = referencePattern.matchEntire(value.trim()) ?: return null
        val raw = romanBookName(match.groupValues[1].trim())
        val requested = normalizedReading(raw)
        val special = specialBook(raw)
        val ranked = books.mapNotNull { row ->
            val score = if (special != null) {
                if (row.text("book_id") == special) 0 else null
            } else aliases(row).mapNotNull {
                val name = normalizedReading(it)
                when {
                    name == requested -> 0
                    requested.length >= 3 && name.startsWith(requested) -> 1
                    else -> typoDistance(requested, name)?.plus(2)
                }
            }.minOrNull()
            score?.let { row to it }
        }
        val best = ranked.minOfOrNull { it.second } ?: return null
        val row = ranked.filter { it.second == best }.map { it.first }
            .distinctBy { it.text("id") to it.text("scheme") }.singleOrNull() ?: return null
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
