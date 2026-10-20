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
    @Test fun localTranslationDownloadsAndTranslatesAnActualText() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("translationQa") == "true")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        LocalTranslation.prepare("en") { println("TRANSLATION_QA $it") }
        assertTrue("pt" in LocalTranslation.installed())
        val file = File(context.cacheDir, "translation-qa-${System.nanoTime()}.sqlite3")
        try {
            val output = LocalTranslation.translate(context, PersonalRepository(file), "The book is on the table.", "en") { println("TRANSLATION_QA $it") }
            println("TRANSLATION_QA_RESULT $output")
            assertTrue(output.lowercase().contains("livro"))
            assertFalse(output.contains("The book"))
        } finally { file.delete() }
    }
}
