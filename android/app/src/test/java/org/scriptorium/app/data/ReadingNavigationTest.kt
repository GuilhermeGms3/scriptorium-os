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
    /** The same cases run on the site (scripture-reference.test.ts): both readers must agree. */
    @Test fun typedReferencesMatchTheSharedCasesOfTheSite() {
        val cases = JSONObject(File("../../src/lib/application/scripture-reference.cases.json").readText())
        val caseBooks = cases.getJSONArray("books").let { list -> (0 until list.length()).map { list.getJSONObject(it) } }.map { book ->
            val id = book.getString("id")
            mapOf("id" to "work:$id", "book_id" to id, "title" to navigation.book(id)?.getString("title"), "chapters" to book.getInt("chapters").toString(), "scheme" to "scriptorium-bcv-1")
        }
        val valid = cases.getJSONArray("valid")
        for (index in 0 until valid.length()) {
            val case = valid.getJSONObject(index)
            val input = case.getString("input")
            val ref = requireNotNull(navigation.parse(input, caseBooks)) { input }
            assertEquals(input, case.getString("book"), ref.book.text("book_id"))
            assertEquals(input, case.getInt("chapter"), ref.chapter)
            assertEquals(input, if (case.has("verse")) case.getInt("verse") else null, ref.verse)
            assertEquals(input, if (case.has("end")) case.getInt("end") else null, ref.end)
        }
        val invalid = cases.getJSONArray("invalid")
        for (index in 0 until invalid.length()) assertNull(invalid.getString(index), navigation.parse(invalid.getString(index), caseBooks))
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
