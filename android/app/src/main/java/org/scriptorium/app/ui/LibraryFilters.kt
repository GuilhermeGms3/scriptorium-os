package org.scriptorium.app.ui

import org.scriptorium.app.data.Row
import org.scriptorium.app.data.text
import java.text.Collator
import java.text.Normalizer
import java.util.Locale

internal data class LibraryFilters(val type: String = "", val subject: String = "", val language: String = "", val descending: Boolean = false) {
    val count: Int get() = listOf(type, subject, language).count { it.isNotEmpty() }
}

internal fun librarySearchKey(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
    .replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT)

/** Display suggestions only; never changes the document's editorial classification. */
internal fun libraryBookType(book: Row): String {
    val title = librarySearchKey(book.text("title") + " " + libraryBookTitle(book.text("title")))
    fun has(vararg terms: String) = terms.any { title.contains(it) }
    return when {
        has("dicionario", "lexico", "ditat", "nditat", "anchor") -> "Dicionários e léxicos"
        has("exegese", "hermeneutica", "doutrina crista", "biblical studies") -> "Exegese e hermenêutica"
        has("comentario", "comentad", "homilia", "notes on the bible", "sermao") -> "Comentários e homilias"
        has("biblia", "bible", "multivers", "nvi", "acf") -> "Bíblias"
        has("arqueologia", "geografia", "historia", "josefo") -> "História e arqueologia"
        has("hammadi", "gnostic", "apocrif", "patrist", "confissoes", "padres", "didaque", "clemente", "policarpo") -> "Fontes antigas e patrística"
        has("teologia", "teologica", "institutas", "catecismo", "confissao", "augsburgo", "trindade", "igreja ortodoxa") -> "Teologia e doutrina"
        else -> "Outros"
    }
}

internal fun libraryLanguage(book: Row): String = when (book.text("language").lowercase(Locale.ROOT).substringBefore('-').substringBefore('_')) {
    "pt" -> "Português"; "en" -> "Inglês"; "es" -> "Espanhol"; "fr" -> "Francês"
    "de" -> "Alemão"; "la" -> "Latim"; "grc", "el" -> "Grego"; "he", "hbo" -> "Hebraico"; "cop" -> "Copta"
    "", "und" -> "Não identificado"
    else -> "Outro idioma"
}

internal fun librarySubjects(book: Row): List<String> = book.text("library_subjects").split('|').filter { it.isNotBlank() }

internal fun filterLibrary(books: List<Row>, query: String, filters: LibraryFilters): List<Pair<Row, String>> {
    val search = librarySearchKey(query.trim())
    val collator = Collator.getInstance(Locale.forLanguageTag("pt-BR"))
    val sorted = books.asSequence().filter { book ->
        (filters.type.isEmpty() || libraryBookType(book) == filters.type) &&
        (filters.language.isEmpty() || libraryLanguage(book) == filters.language) &&
        (filters.subject.isEmpty() || filters.subject in librarySubjects(book)) &&
        (search.isEmpty() || librarySearchKey(book.text("title") + " " + libraryBookTitle(book.text("title"))).contains(search))
    }.map { it to libraryBookTitle(it.text("title")) }.toList()
        .sortedWith { a, b -> collator.compare(a.second, b.second) }
    return if (filters.descending) sorted.reversed() else sorted
}
