package org.scriptorium.app.data

import org.scriptorium.app.content.Edition

/** Matching numbers alone cannot establish equivalence between different reference schemes. */
internal fun editionPassage(current: Passage, target: Edition, books: List<Row>): Passage? {
    val book = books.firstOrNull {
        it.text("id") == current.workId && it.text("book_id") == current.bookId && it.text("scheme") == current.scheme
    } ?: return null
    return current.copy(edition = target, title = book.text("title"))
}

internal fun passageAvailable(passage: Passage, verses: List<Row>): Boolean {
    if (verses.isEmpty()) return false
    val start = passage.verse ?: return true
    val end = passage.verseEnd ?: start
    if (start < 1 || end < start) return false
    return (start..end).all { verse -> verses.any {
        verse in it.number("verse_start")..it.number("verse_end").coerceAtLeast(it.number("verse_start"))
    } }
}
