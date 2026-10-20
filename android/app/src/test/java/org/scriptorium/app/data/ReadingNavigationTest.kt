package org.scriptorium.app.data

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.scriptorium.app.content.Edition
import java.io.File
import java.time.LocalDate

class ReadingNavigationTest {
    private val labels = JSONObject(File("../reading-labels.json").readText())
    private val navigation = ReadingNavigation(labels)
    private val books = listOf("john" to 21, "job" to 42, "jonah" to 4, "1-corinthians" to 16, "psalms" to 150, "genesis" to 50).map { (id, chapters) ->
        mapOf("id" to "work:$id", "book_id" to id, "title" to navigation.book(id)?.getString("title"), "chapters" to "$chapters", "scheme" to "scriptorium-bcv-1")
    }
    @Test fun portugueseNamesAbbreviationsAndCompactReferences() {
        for (value in listOf("Jo 3:16", "Jo3:16", "João 3:16", "joao 3,16", "John 3:16")) {
            val ref = requireNotNull(navigation.parse(value, books))
            assertEquals(value, "john", ref.book.text("book_id")); assertEquals(3, ref.chapter); assertEquals(16, ref.verse)
        }
        assertEquals("job", navigation.parse("Jó 3:16", books)?.book?.text("book_id"))
        assertEquals("jonah", navigation.parse("Jn 3:2", books)?.book?.text("book_id"))
        assertEquals(4, navigation.parse("1Co13:4-7", books)?.verse)
        assertEquals(7, navigation.parse("I Coríntios 13:4-7", books)?.end)
        assertEquals(119, navigation.parse("Sl 119:105", books)?.chapter)
        assertEquals(119, navigation.parse("Salmo 119:105", books)?.chapter)
        assertEquals(4, navigation.parse("1 Cor 13:4", books)?.verse)
        assertNull(navigation.parse("Gênesis 1", books)?.verse)
    }
    @Test fun malformedAmbiguousAndUnavailableAddressesAreRejected() {
        for (value in listOf("Jo 99:1", "Jo 0:1", "Jo 1:0", "Jo 3:16-2", "Livro 1:1", "Jo -1:2", "Jo 3:16 SELECT", "J 3:16")) assertNull(value, navigation.parse(value, books))
    }
    @Test fun savedPassageRetainsExactEditionSchemeAndRange() {
        val edition = Edition("test", "Teste", "corpus/test.sqlite3")
        val passage = Passage(edition, "work:john", "john", "João", 3, "another-scheme", 16, 18)
        assertEquals(passage, decodePassage(passage.encoded(), listOf(edition)))
        assertNull(decodePassage(passage.encoded(), emptyList()))
        assertNull(decodePassage("{broken", listOf(edition)))
    }
    @Test fun dailySelectionComesFromActualChapterCountsAcrossTheWholeMonth() {
        val dates = (1..31).map { LocalDate.of(2026, 10, it) }
        val selections = dates.map { requireNotNull(dailyChapter(it, books)) }
        assertEquals(31, selections.map { it.first.text("id") to it.second }.distinct().size)
        assertTrue(selections.all { it.second in 1..it.first.number("chapters") })
        assertNull(dailyChapter(dates.first(), emptyList()))
    }
    @Test fun topicLabelsComeFromDesktopEditorialNamesWithoutEntityIdentifiers() {
        assertEquals("Trindade", navigation.topic("doctrine:trinity", "doctrine:trinity"))
        assertFalse(navigation.topic("unknown:id", "unknown:id").contains(':'))
        assertEquals("Gênesis 1: texto, contexto e interpretações", navigation.topic("course:genesis-1", "Gênesis 1: texto, contexto e interpretações"))
        assertEquals("Pentateuco", navigation.group("genesis"))
        assertEquals("Cartas paulinas", navigation.group("1-corinthians"))
    }
    @Test fun commentFiltersDoNotInventExegesisForAProofText() {
        val proof = mapOf("source_title" to "Catecismo da Igreja Católica", "payload_json" to """{"referenceRole":"proof-text","contextualAnalysis":{"contentType":"theological-interpretation"}}""")
        assertTrue("Catequese e confissão" in proof.commentCategories())
        assertFalse("Exegese" in proof.commentCategories())
        assertEquals(setOf("Hermenêutica e método"), mapOf("payload_json" to """{"contextualAnalysis":{"contentType":"methodological-guidance"}}""").commentCategories())
    }
}
