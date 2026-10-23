package org.scriptorium.app.data

import org.junit.Assert.*
import org.junit.Test
import org.scriptorium.app.content.Edition

class ReadingAppearanceTest {
    @Test fun fontSizeIsBoundedAndDefaultsDoNotEnableDockOrDisableAnimation() {
        assertEquals(18, ReadingAppearance(size = -200).normalized().size)
        assertEquals(32, ReadingAppearance(size = 200).normalized().size)
        assertEquals(24, ReadingAppearance(size = 24).normalized().size)
        assertFalse(ReadingAppearance().dockedComments)
        assertTrue(ReadingAppearance().motion)
    }
    @Test fun dockPreservesEveryInlineSourceWithRangesAndContext() {
        val passage = Passage(Edition("e", "Edição", "e.sqlite3"), "w", "genesis", "Gênesis", 1, "scheme")
        val verses = (1..4).map { mapOf("verse_start" to "$it", "verse_end" to "$it") }
        val comments = (1..5).map { mapOf("id" to "c$it", "document_id" to "d$it", "payload_json" to "{}") }
        fun target(start: String?, end: String? = start) = mapOf("work_id" to "w", "scheme_id" to "scheme", "book_id" to "genesis", "chapter" to "1", "verse_start" to start, "verse_end" to end)
        val targets = mapOf("c1" to listOf(target("1")), "c2" to listOf(target("1", "3")), "c3" to listOf(target("4")), "c4" to listOf(target(null)), "c5" to listOf(target("2")))
        val groups = commentGroups(passage, verses, comments, targets)
        assertEquals(comments.map { it.text("id") }.toSet(), groups.flatMap { it.comments }.map { it.text("id") }.toSet())
        assertEquals(listOf("c1", "c2"), groups.single { it.verse == 1 }.comments.map { it.text("id") })
        assertEquals(listOf("c4"), groups.single { it.verse == null }.comments.map { it.text("id") })
        assertEquals(listOf("c2"), groups.single { it.verse == 3 }.comments.map { it.text("id") })
    }
    @Test fun filtersDoNotAlterTheirInputAndDoNotTreatCatechismAsExegesis() {
        val scripture = mapOf("id" to "a", "document_id" to "genebra", "payload_json" to """{"contextualAnalysis":{"contentType":"source-commentary"}}""")
        val catechism = mapOf("id" to "b", "document_id" to "catecismo", "source_title" to "Catecismo", "payload_json" to """{"referenceRole":"proof-text"}""")
        val all = listOf(scripture, catechism)
        assertEquals(listOf(scripture), filterComments(all, "Exegese e comentário bíblico", null))
        assertEquals(listOf(catechism), filterComments(all, null, "catecismo"))
        assertEquals(all, filterComments(all, null, null))
        assertTrue(filterComments(all, "Exegese e comentário bíblico", "catecismo").isEmpty())
        assertEquals(2, all.size)
    }
}
