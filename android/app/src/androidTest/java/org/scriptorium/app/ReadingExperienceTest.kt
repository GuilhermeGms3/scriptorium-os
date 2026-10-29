package org.scriptorium.app

import android.util.AtomicFile
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.data.*
import kotlinx.coroutines.runBlocking
import java.io.File

class ReadingExperienceTest {
    @Test fun groupedGenesisSourcesKeepAllInstalledComments() {
        InstrumentationRegistry.getArguments().getString("readerPackage")?.let { path ->
            require(android.os.Build.FINGERPRINT.contains("generic") || android.os.Build.MODEL.contains("sdk")) { "Pacote de QA somente no emulador" }
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            val pointer = AtomicFile(File(context.filesDir, "active-content"))
            ContentPackageStore(File(context.filesDir, "content"),
                { pointer.openRead().use { it.readBytes().decodeToString() } },
                { id -> val output = pointer.startWrite(); output.write(id.toByteArray()); pointer.finishWrite(output) }, Sqlite::validate)
                .install(File(path).inputStream())
        }
        val repo = repository()
        val passage = requireNotNull(repo.resolveReadingReference("Gn 3:1", repo.readingBooks()))
        val all = repo.comments(passage)
        val groups = commentGroups(passage, repo.verses(passage), all, repo.chapterTargets(passage))
        val verse = groups.first { it.verse == 1 }
        val sources = commentsBySource(verse.comments)
        assertEquals(verse.comments.size, sources.sumOf { it.size })
        assertEquals(verse.comments.toSet(), sources.flatten().toSet())
        assertTrue(sources.any { it.size > 1 })
        println("GROUPED_GENESIS_QA excerpts=${verse.comments.size} sources=${sources.size} noDiscard passed")
    }

    @Test fun didacheFeedTranslatesEveryLoadedUnitWithTheRealLocalModel() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("translationQa") == "true")
        val repo = repository()
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val work = repo.primaryWorks().first { normalizedReading(it.text("title")).let { title -> title.contains("dida") } }
        val edition = repo.editions().first { it.id == work.text("edition_id") }
        val units = repo.primaryUnits(edition, work.text("id"), 0)
        val personal = PersonalRepository(File(context.filesDir, "translation-feed-qa.sqlite3"))
        val output = linkedMapOf<String, String>()
        translateReadingFeed(units, { LocalTranslation.translate(context, personal, it, "en") {} }) { id, text -> output[id] = text }
        assertEquals(units.count { it.text("surface_text").isNotBlank() }, output.size)
        assertTrue(output.values.all { it.isNotBlank() })
        assertTrue(output.values.zip(units).any { (translated, unit) -> translated != unit.text("surface_text") })
        assertEquals(units, repo.primaryUnits(edition, work.text("id"), 0))
        println("DIDACHE_FEED_QA realLocalModel units=${output.size} originalsUnchanged passed")
    }

    @Test fun typedReadingReferencesUseRealInstalledVersesAndRejectMissingAddresses() {
        val repo = repository()
        val catalog = repo.readingBooks()
        for (input in listOf("romanos 12 2", "Romnaos 12:2", "Rm 12,2")) {
            val passage = requireNotNull(repo.resolveReadingReference(input, catalog)) { input }
            assertEquals("romans", passage.bookId)
            assertEquals(12, passage.chapter)
            assertEquals(2, passage.verse)
            assertTrue(repo.verses(passage).any { it.number("verse_start") == 2 })
        }
        assertNull(repo.resolveReadingReference("salmos 67 15", catalog))
        assertNull(repo.resolveReadingReference("romanos 12 99", catalog))
        assertNull(repo.resolveReadingReference("romanos 99", catalog))
        assertEquals(67, repo.resolveReadingReference("salmos 67", catalog)!!.chapter)
        println("READING_REFERENCE_QA realRomans12v2/typo/invalidPsalm/references passed")
    }

    @Test fun additionalTextsAndPortugueseTitlesResolveToInstalledContent() {
        val repo = repository()
        val catalog = repo.readingBooks()
        for (id in listOf("judith", "1-maccabees", "2-maccabees", "greek-daniel", "susanna", "bel-and-the-dragon")) {
            val entry = catalog.first { it.row.text("book_id") == id }
            assertTrue(repo.navigation.bookMatches(id, "Apócrifo"))
            val row = entry.row
            assertTrue(repo.verses(Passage(entry.edition, row.text("id"), id, row.text("title"), 1, row.text("scheme"))).isNotEmpty())
        }
        assertEquals("Judite", catalog.first { it.row.text("book_id") == "judith" }.row.text("title"))
        assertTrue(repo.primaryWorks().first { it.text("id") == "work:gospel-thomas-coptic" }.text("title").startsWith("Evangelho de Tomé"))
        assertTrue(repo.ancientReadingSections().any { it.text("title") == "Evangelho de Judas" && it.number("page_index") >= 0 })
        val edition = repo.scriptureEditions().first()
        assertTrue(repo.search("Deus", edition, LocalSearchScope.SCRIPTURE).all { hit ->
            val passage = requireNotNull(hit.passage)
            hit.title.startsWith(repo.navigation.bookTitle(passage.bookId, passage.title))
        })
        println("ADDITIONAL_TEXTS_QA six real chapters/Portuguese titles/Judas installed page passed")
    }
    @Test fun academicFormationHasRealChaptersPassagesAndLibraryLinks() {
        val repository = repository()
        val formation = requireNotNull(repository.catalogItem("course:theology-formation"))
        val modules = formation.objects("modules")
        assertEquals(18, modules.size)
        assertEquals(1, repository.catalog("course").count { it.text("id") == formation.getString("id") })
        val edition = repository.scriptureEditions().first { it.id == "biblia-livre-n4-2025.1.0" }
        var readingCount = 0
        for (module in modules) {
            module.objects("passages").forEach { reading ->
                val ref = reading.getJSONObject("ref")
                val book = repository.books(edition).first { it.text("book_id") == ref.getString("bookId") }
                val passage = Passage(edition, book.text("id"), book.text("book_id"), book.text("title"), ref.getInt("chapter"), book.text("scheme"))
                assertTrue(repository.verses(passage).isNotEmpty()); readingCount++
            }
            assertTrue(repository.lessonReadings("study-guide:${module.getString("studyGuideId")}", module.optString("readingSearch", module.getString("title"))).isNotEmpty())
            assertTrue(CoursePolicy.issues(module, JSONObject()).isNotEmpty())
        }
        assertEquals(48, readingCount)
        println("FORMATION_DATA_QA modules=${modules.size} passages=$readingCount linkedLibrary=18 noFakeCompletion passed")
    }
    private fun repository(): MobileRepository {
        assumeTrue(InstrumentationRegistry.getArguments().getString("fullQa") == "true")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val pointer = AtomicFile(File(context.filesDir, "active-content"))
        return MobileRepository(ContentPackageStore(File(context.filesDir, "content"), { pointer.openRead().use { it.readBytes().decodeToString() } }, { error("Read-only QA") }, Sqlite::validate),
            ReadingNavigation(JSONObject(context.assets.open("reading-labels.json").bufferedReader().use { it.readText() })))
    }
    @Test fun realReferencesRangesAndAncientTexts() {
        val repository = repository()
        val edition = repository.scriptureEditions().first()
        val started = System.nanoTime()
        val short = requireNotNull(repository.resolveReference("Jo3:16", edition))
        println("REFERENCE_QA firstMs=${(System.nanoTime() - started) / 1_000_000}")
        assertEquals("john", short.bookId); assertEquals(16, short.verse)
        val warm = System.nanoTime()
        val psalm = requireNotNull(repository.resolveReference("Sl 119:105", edition))
        println("REFERENCE_QA cachedMs=${(System.nanoTime() - warm) / 1_000_000}")
        assertTrue(repository.verses(psalm).any { it.number("verse_start") == 105 })
        assertNull(repository.resolveReference("Jo 3:999", edition))
        assertNull(repository.resolveReference("Jo 3:16-999", edition))
        val range = requireNotNull(repository.resolveReference("1Co 13:4-7", edition))
        assertEquals(7, range.verseEnd)
        assertTrue(repository.catalog("lesson").all { !it.text("title").contains(Regex("^(doctrine|entity|method|tradition|topic|study-guide):")) })
        assertEquals("Trindade", repository.catalogItem("lesson:doctrine:trinity")?.getString("title"))
        assertTrue(repository.primaryWorks().any { it.text("id") == "work:gospel-thomas-coptic" && it.number("unit_count") > 0 })
        assertTrue(repository.documents().any { normalizedReading(it.text("title")).contains("hammadi") })
        val genesis = requireNotNull(repository.resolveReference("Gn1:1", edition))
        assertTrue(repository.comments(genesis).flatMap { it.commentCategories() }.distinct().size > 1)
    }
    @Test fun searchScopesSeparateScriptureFromRealLibraryPages() {
        val repository = repository()
        val edition = repository.scriptureEditions().first()
        val scripture = repository.search("Deus", edition, LocalSearchScope.SCRIPTURE)
        assertTrue(scripture.isNotEmpty()); assertTrue(scripture.all { it.passage != null && it.page == null })
        val library = repository.search("Deus", edition, LocalSearchScope.LIBRARY)
        assertTrue(library.isNotEmpty()); assertTrue(library.all { it.page != null && it.passage == null })
        for (scope in listOf(LocalSearchScope.EXEGESIS, LocalSearchScope.HERMENEUTICS)) {
            val started = System.nanoTime()
            val results = repository.search("Deus", edition, scope)
            val elapsed = (System.nanoTime() - started) / 1_000_000
            assertTrue("Filtro precisa responder sem varrer vínculos por resultado: ${elapsed}ms", elapsed < 10_000)
            assertTrue(results.all { it.page != null && it.passage == null })
            println("SEARCH_SCOPE_QA $scope pages=${results.size} elapsedMs=$elapsed")
        }
        val result = scripture.first().passage!!
        assertTrue(repository.verses(result).any { it.number("verse_start") == result.verse })
    }

    @Test fun localTranslationDownloadsAndTranslatesAnActualText() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("translationQa") == "true")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val file = File(context.cacheDir, "translation-qa-${System.nanoTime()}.sqlite3")
        try {
            for ((source, original) in listOf("en" to "The book is on the table.", "es" to "El libro está sobre la mesa.")) {
                LocalTranslation.prepare(source) { println("TRANSLATION_QA $source $it") }
                assertTrue("pt" in LocalTranslation.installed())
                val output = LocalTranslation.translate(context, PersonalRepository(file), original, source) { println("TRANSLATION_QA $source $it") }
                println("TRANSLATION_QA_RESULT $source $output")
                assertTrue(output.lowercase().contains("livro"))
                assertFalse(output == original)
            }
        } finally { file.delete() }
    }

    @Test fun thematicReadingsResolveToRealInstalledBooksAndPages() {
        val repository = repository()
        val readings = repository.lessonReadings("doctrine:trinity", "Trindade")
        assertTrue("Aula deve recuperar fontes reais", readings.isNotEmpty())
        val installedWorks = repository.primaryWorks().map { it.text("id") }.toSet()
        val installedDocuments = repository.documents().map { it.text("id") }.toSet()
        readings.forEach { reading ->
            reading.work?.let { assertTrue(it.text("id") in installedWorks) }
            reading.page?.let { assertTrue(it.text("document_id") in installedDocuments); assertNotNull(repository.page(it.text("document_id"), it.number("page_index"))) }
        }
        val genesis = requireNotNull(repository.resolveReference("Gn1:1", repository.scriptureEditions().first()))
        val all = repository.comments(genesis)
        val groups = commentGroups(genesis, repository.verses(genesis), all, repository.chapterTargets(genesis))
        assertEquals("O painel inferior conserva os comentários do capítulo", all.map { it.text("id") }.toSet(), groups.flatMap { it.comments }.map { it.text("id") }.toSet())
        println("READING_INVENTORY_QA genesisSources=${all.size} lessonReadings=${readings.size}")
    }

    @Test fun installedThematicCatalogHasRealReadingCoverage() {
        val repository = repository()
        val lessons = repository.catalog("lesson")
        assertTrue(lessons.isNotEmpty())
        assertTrue(lessons.all { repository.navigation.lesson(it.text("id")) != null })
        val missing = lessons.filter { repository.lessonReadings(it.text("id"), it.text("title")).isEmpty() }.map { it.text("title") }
        println("LESSON_COVERAGE_QA total=${lessons.size} missing=${missing.joinToString(" | ")}")
        assertTrue("Aulas sem leitura instalada: ${missing.joinToString()}", missing.isEmpty())
    }
}
