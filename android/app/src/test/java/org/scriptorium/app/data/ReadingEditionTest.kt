package org.scriptorium.app.data

import org.junit.Assert.*
import org.junit.Test
import org.scriptorium.app.content.Edition

class ReadingEditionTest {
    private val source = Edition("source", "Original", "source.sqlite3")
    private val target = Edition("target", "Outra tradução", "target.sqlite3")
    private val passage = Passage(source, "work:john", "john", "João", 2, "canonical", 4)
    private val book: Row = mapOf("id" to "work:john", "book_id" to "john", "scheme" to "canonical", "title" to "João")
    private fun verse(start: Int, end: Int = start): Row = mapOf("verse_start" to "$start", "verse_end" to "$end")

    @Test fun preservesPassageAndUsesTheChosenEdition() {
        assertEquals(passage.copy(edition = target), editionPassage(passage, target, listOf(book)))
        assertTrue(passageAvailable(passage, listOf(verse(3, 5))))
    }
    @Test fun doesNotInventEquivalenceBetweenSchemesOrWorks() {
        assertNull(editionPassage(passage, target, listOf(book + ("scheme" to "septuagint"))))
        assertNull(editionPassage(passage, target, listOf(book + ("book_id" to "genesis"))))
        assertNull(editionPassage(passage, target, listOf(book + ("id" to "other-work"))))
        assertNull(editionPassage(passage, target, emptyList()))
    }
    @Test fun refusesMissingVersesChaptersAndIncompleteRanges() {
        assertFalse(passageAvailable(passage, emptyList()))
        assertFalse(passageAvailable(passage, listOf(verse(1), verse(3))))
        assertFalse(passageAvailable(passage.copy(verse = 1, verseEnd = 3), listOf(verse(1), verse(3))))
        assertTrue(passageAvailable(passage.copy(verse = null), listOf(verse(1))))
        assertTrue(passageAvailable(passage.copy(verse = 1, verseEnd = 3), listOf(verse(1, 3))))
    }
    @Test fun chosenEditionTakesPriorityWithoutLosingBooksFoundInOthers() {
        val fallback = Edition("biblia-livre-n4-2025.1.0", "Livre", "fallback.sqlite3")
        val genesis = book + mapOf("id" to "work:genesis", "book_id" to "genesis")
        val catalog = readingBookCatalog(listOf(fallback to listOf(book, genesis), target to listOf(book)), target.id)
        assertEquals(target, catalog.first { it.row.text("book_id") == "john" }.edition)
        assertEquals(fallback, catalog.first { it.row.text("book_id") == "genesis" }.edition)
    }
}
