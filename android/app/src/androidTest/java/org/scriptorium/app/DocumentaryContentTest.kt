package org.scriptorium.app

import android.util.AtomicFile
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.data.*
import java.io.File

/** Explicit read-only QA of the private package; never runs on the public CI. */
@RunWith(AndroidJUnit4::class)
class DocumentaryContentTest {
    private fun store(): ContentPackageStore {
        assumeTrue(InstrumentationRegistry.getArguments().getString("documentaryQa") == "true")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val pointer = AtomicFile(File(context.filesDir, "active-content"))
        return ContentPackageStore(File(context.filesDir, "content"),
            { pointer.openRead().use { it.readBytes().toString(Charsets.UTF_8) } },
            { error("Este QA não altera o acervo") }, Sqlite::validate)
    }
    @Test fun completePackageHasAllBooksAndValidDocumentaryRelations() {
        val current = requireNotNull(store().current())
        assertEquals(57, current.files.keys.count { it.endsWith(".pdf") })
        assertEquals(11, current.manifest.editions.size)
        Sqlite.open(current.file("content.sqlite3")).use { db ->
            assertTrue(db.rows("PRAGMA foreign_key_check").isEmpty())
            assertTrue(db.rows("SELECT count(DISTINCT id) n FROM documentary_readings").single().number("n") >= 34000)
            assertEquals("{}", db.rows("SELECT payload_json FROM personal_seed").single().text("payload_json"))
        }
    }
    @Test fun nativeStudyAndGreekDictionaryUseNewReadings() {
        val repository = MobileRepository(store())
        val readings = repository.lessonReadings("doctrine:trinity", "Trindade")
        assertTrue(readings.any { it.id.startsWith("documentary:") && it.page != null })
        val entries = repository.privateLexicalEntries(mapOf("lemma_text" to "λόγος"))
        assertTrue(entries.isNotEmpty())
        assertTrue(entries.all { it.text("excerpt").isNotBlank() && it.number("end_offset") > it.number("start_offset") })
    }
}
