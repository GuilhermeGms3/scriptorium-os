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
    @Test fun recoveredOcrPatchFeedsNativeReaderAndStudies() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("ocrQa") == "true")
        val contentStore = store()
        val current = requireNotNull(contentStore.current())
        val keenerChecksum = "7908244b4c9208b2c75e4dd43d51c9d44f906b78568aecdb54cb9d7583955eec"
        Sqlite.open(current.file("content.sqlite3")).use { db ->
            assertEquals(50934, db.rows("SELECT count(*) n FROM comments").single().number("n"))
            assertEquals(35065, db.rows("SELECT count(DISTINCT id) n FROM documentary_readings").single().number("n"))
            assertEquals(4851, db.rows("SELECT count(*) n FROM comments c JOIN documents d ON d.id=c.document_id WHERE d.checksum=?", listOf(keenerChecksum)).single().number("n"))
            assertEquals(27, db.rows("SELECT count(DISTINCT t.book_id) n FROM targets t JOIN comments c ON c.id=t.comment_id JOIN documents d ON d.id=c.document_id WHERE d.checksum=?", listOf(keenerChecksum)).single().number("n"))
            assertEquals(830, db.rows("SELECT count(*) n FROM pages p JOIN documents d ON d.id=p.document_id WHERE d.checksum=? AND trim(p.text)<>''", listOf(keenerChecksum)).single().number("n"))
        }
        val repository = MobileRepository(contentStore)
        val passage = Passage(current.manifest.editions.first(), "work:matthew", "matthew", "Mateus", 1, "scriptorium-bcv-1", 1)
        val comments = repository.comments(passage)
        val keenerId = repository.documents().single { it.text("checksum") == keenerChecksum }.text("id")
        assertTrue(comments.any { it.text("document_id") == keenerId })
        assertTrue(repository.lessonReadings("study-guide:hermeneutica", "Hermenêutica").isNotEmpty())
    }
}
