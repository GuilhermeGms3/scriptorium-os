package org.scriptorium.app.data

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.scriptorium.app.content.Edition
import java.io.File
import java.time.LocalDate

class ReadingNavigationTest {
    @Test fun fallGraceCurriculumUsesCatalogRouteKeysAndKeepsLegacyProgressIdentity() {
        val metadata = ReadingNavigation(JSONObject(File("../reading-labels.json").readText()))
        val catalog = metadata.editorialCourses()
        assertEquals(setOf("course:genesis-1", "course:queda-graca-providencia"), catalog.map { it.getString("id") }.toSet())
        assertEquals("genesis-1", metadata.editorialCourse("course:genesis-1")!!.getString("id"))
        val course = metadata.editorialCourse("course:queda-graca-providencia")!!
        val modules = course.objects("modules")
        assertEquals(14, modules.size)
        assertEquals(5, modules[1].objects("lessons").size)
        assertTrue(modules.all { it.objects("foundation").isNotEmpty() && it.objects("passages").isNotEmpty() })
        assertEquals("work:aquinas-summa-prima-pars", modules[1].objects("libraryWorks").first().getString("workId"))
        modules.flatMap { it.objects("lessons") }.forEach { lesson ->
            val words = lesson.objects("sections").flatMap { it.strings("paragraphs") }.joinToString(" ").split(Regex("\\s+")).size
            assertTrue("Aula não aprofundada: ${lesson.optString("id")}", words > 1000)
        }
        assertEquals(18, modules.flatMap { it.objects("connections") }.count { it.has("ref") })
        assertTrue(modules.first { it.optString("id") == "cristo" }.objects("connections").any { it.optJSONObject("ref")?.optString("bookId") == "john" })
        assertFalse(StudySequence.unlocked(modules, 1, emptyList()))
        assertTrue(CoursePolicy.issues(modules.first(), JSONObject()).isNotEmpty())
        course.put("modules", org.json.JSONArray())
        assertEquals(14, metadata.editorialCourse("course:queda-graca-providencia")!!.objects("modules").size)
        assertTrue(ReadingNavigation().editorialCourses().isEmpty())
    }
    @Test fun updatedLessonsOverlayOldCorpusWithoutLosingChapterIdentityOrLeakingMutableObjects() {
        val metadata = ReadingNavigation(JSONObject(File("../reading-labels.json").readText()))
        val topic = metadata.editorialLesson("lesson:doctrine:trinity")!!
        val first = topic.objects("chapters").first()
        assertEquals("overview:doctrine:trinity", first.getString("id"))
        assertTrue(first.getJSONObject("deepening").getString("caseStudy").contains("Mateus"))
        first.put("title", "alterado")
        assertEquals("Trindade", metadata.editorialLesson("lesson:doctrine:trinity")!!.objects("chapters").first().getString("title"))
        assertEquals(listOf("interpretation", "context", "parable", "reception"), metadata.editorialLesson("lesson:study-guide:biblia-interpretacao")!!.objects("chapters").map { it.getString("id") })
        assertNotNull(metadata.editorialCourse("course:genesis-1"))
        assertNull(metadata.editorialLesson("lesson:user:new"))
        assertNull(ReadingNavigation().editorialLesson("lesson:doctrine:trinity"))
        assertTrue(metadata.lessonReferences().isNotEmpty())
    }
    @Test fun discoveryIsAvailableWithoutReimportingCorpusAndReturnsIndependentSnapshots() {
        val metadata = ReadingNavigation(JSONObject(File("../reading-labels.json").readText()))
        val course = requireNotNull(metadata.discovery())
        assertEquals("course:conhecer-para-amar", course.getString("id"))
        assertEquals(6, course.objects("modules").size)
        course.put("title", "alterado")
        assertEquals("Conhecimento de Deus — fé e razão", metadata.discovery()!!.getString("title"))
        assertNull(ReadingNavigation().discovery())
        val first = metadata.discovery()!!.objects("modules").first()
        assertTrue(CoursePolicy.issues(first, JSONObject()).isNotEmpty())
        val passage = first.objects("passages").single().getJSONObject("ref")
        assertEquals(35, passage.getInt("verseStart"))
        assertEquals(39, passage.getInt("verseEnd"))
    }
    @Test fun additionalScripturesAndReferencesHavePortugueseLabelsAndFilters() {
        val metadata = ReadingNavigation(JSONObject(File("../reading-labels.json").readText()))
        assertEquals("Judite", metadata.bookTitle("judith", "Judith"))
        assertEquals("1 Macabeus", metadata.bookTitle("1-maccabees", "1 Maccabees"))
        assertEquals("Susana", metadata.bookTitle("susanna", "Susanna"))
        assertEquals("Daniel Grego", metadata.bookTitle("greek-daniel", "Greek Daniel"))
        assertTrue(metadata.bookMatches("judith", "Apócrifo"))
        assertTrue(metadata.bookMatches("2-maccabees", "Não canônico"))
        assertFalse(metadata.bookMatches("matthew", "Apócrifo"))
        assertEquals("1 Reis 2:3–5", metadata.reference("1-kings", "1 Kings", 2, 3, 5))
        assertEquals("Mateus 5:1", metadata.reference("matthew", "Matthew", 5, 1))
        assertTrue(metadata.workTitle("work:gospel-thomas-coptic", "Gospel of Thomas").startsWith("Evangelho de Tomé"))
    }
    @Test fun bookCatalogIncludesOldTestamentDespitePartialEditionBeingFirst() {
        val greek = Edition("sbl", "Novo Testamento grego", "greek.sqlite3")
        val portuguese = Edition("biblia-livre-n4-2025.1.0", "Bíblia em português", "pt.sqlite3")
        fun book(id: String) = mapOf("id" to "work:$id", "book_id" to id)
        val catalog = readingBookCatalog(listOf(greek to listOf(book("john")), portuguese to listOf(book("genesis"), book("psalms"), book("john"))))
        assertEquals(listOf("genesis", "psalms", "john"), catalog.map { it.row.text("book_id") })
        assertTrue(catalog.all { it.edition == portuguese })
    }
    @Test fun bookCatalogRetainsBooksAvailableOnlyInAnotherEdition() {
        val first = Edition("partial", "Parcial", "a.sqlite3")
        val other = Edition("other", "Outra", "b.sqlite3")
        val row = mapOf("id" to "work:genesis", "book_id" to "genesis", "scheme" to "original")
        val catalog = readingBookCatalog(listOf(first to emptyList(), other to listOf(row)))
        assertEquals(ReadingBook(other, row), catalog.single())
        assertTrue(readingBookCatalog(emptyList()).isEmpty())
    }
    private val labels = JSONObject(File("../reading-labels.json").readText())
    private val navigation = ReadingNavigation(labels)
    @Test fun editorialTreeAndFoundationsReplaceOldPackagePresentationWithoutChangingProgressKeys() {
        val tree = requireNotNull(navigation.studyTree())
        val nodes = tree.objects("nodes").associateBy { it.getString("id") }
        assertEquals(16, nodes.size)
        tree.objects("edges").forEach { edge ->
            assertTrue(nodes.getValue(edge.getString("to")).getInt("x") > nodes.getValue(edge.getString("from")).getInt("x"))
        }
        val course = requireNotNull(navigation.discovery())
        assertEquals("course:conhecer-para-amar", course.getString("id"))
        assertEquals("Conhecimento de Deus — fé e razão", course.getString("title"))
        course.objects("modules").forEach { assertTrue(it.objects("foundation").isNotEmpty()) }
        val foundation = course.objects("modules").first().objects("foundation").first()
        assertEquals("Filosofia", foundation.getString("area"))
        assertTrue(foundation.objects("sources").all { it.has("locator") && it.has("limit") })
        tree.put("nodes", org.json.JSONArray())
        assertEquals(16, navigation.studyTree()!!.objects("nodes").size)
    }
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
    /** The same cases run on the site (note-placement.test.ts): a note lands in the same place. */
    @Test fun notesLandWhereTheSiteShowsThem() {
        val cases = JSONObject(File("../../src/lib/domain/note-placement.cases.json").readText())
        val chapter = cases.getJSONObject("chapter")
        val passage = Passage(Edition("ed", "Edição", "ed.sqlite3"), "work:" + chapter.getString("bookId"), chapter.getString("bookId"), "João", chapter.getInt("chapter"), chapter.getString("schemeId"))
        val verses = (1..chapter.getInt("verses")).map { mapOf("verse_start" to "$it", "verse_end" to "$it") }
        fun text(json: JSONObject, key: String) = if (json.isNull(key)) null else json.get(key).toString()
        val notes = cases.getJSONArray("notes")
        for (index in 0 until notes.length()) {
            val note = notes.getJSONObject(index)
            val name = note.getString("name")
            val list = note.getJSONArray("targets")
            val targets = (0 until list.length()).map { list.getJSONObject(it) }.map { target ->
                mapOf("work_id" to target.getString("workId"), "scheme_id" to target.getString("schemeId"), "book_id" to target.getString("bookId"),
                    "chapter" to text(target, "chapter"), "verse_start" to text(target, "verseStart"), "verse_end" to text(target, "verseEnd"))
            }
            val groups = commentGroups(passage, verses, listOf(mapOf("id" to name)), mapOf(name to targets))
            val expected = note.getJSONArray("verses").let { array -> (0 until array.length()).map(array::getInt) }
            assertEquals(name, expected, groups.mapNotNull { it.verse })
            assertEquals(name, note.getBoolean("context"), groups.any { it.verse == null })
        }
    }
    @Test fun theologyCodesUseTheSiteNames() {
        assertEquals("concorre com", navigation.term("relations", "competes-with"))
        assertEquals("pertence ao tema", navigation.term("relations", "belongs-to-topic"))
        assertEquals("Análise linguística", navigation.term("claimKinds", "linguistic-analysis"))
        assertEquals("Fonte conferida", navigation.term("reviewStatus", "source-checked"))
        // A code the site has not named yet still reads as words, never as a hyphenated id.
        assertEquals("brand new", navigation.term("relations", "brand-new"))
        assertEquals("Cristologia", navigation.topic("topic:christology", "Christology"))
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
