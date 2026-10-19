package org.scriptorium.app

import android.util.AtomicFile
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.Assume.assumeNotNull
import org.junit.runner.RunWith
import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.data.*
import java.io.File

/** Opt-in integration QA: caller must supply a real private package, never bundled in the APK. */
@RunWith(AndroidJUnit4::class)
class InstalledAcervoTest {
    @Test fun actualCorpusCommentsSourcesTraceSearchAndPersonalPersistence() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val suppliedPath = InstrumentationRegistry.getArguments().getString("packagePath")
        assumeNotNull("QA privado exige -e packagePath; não há livros privados no APK de testes.", suppliedPath)
        val packagePath = requireNotNull(suppliedPath)
        val pointer = AtomicFile(File(context.filesDir, "active-content"))
        val store = ContentPackageStore(File(context.filesDir, "content"),
            { if (pointer.baseFile.exists()) pointer.openRead().use { it.readBytes().toString(Charsets.UTF_8) } else null },
            { id -> val output = pointer.startWrite(); output.write(id.toByteArray()); pointer.finishWrite(output) }, Sqlite::validate)
        val installed = store.install(File(packagePath).inputStream())
        val repo = MobileRepository(store)
        assertTrue(repo.editions().isNotEmpty())
        val edition = repo.scriptureEditions().first { it.id == "biblia-livre-n4-2025.1.0" }
        val genesis = repo.books(edition).first { it.text("book_id") == "genesis" }
        assertEquals("Use o endereço de navegação explícito já auditado pelo importador", "scriptorium-bcv-1", genesis.text("scheme"))
        val passage = Passage(edition, genesis.text("id"), "genesis", genesis.text("title"), 1, genesis.text("scheme"))
        assertTrue(repo.verses(passage).size >= 31)
        assertTrue(repo.verses(passage).first().text("id").isNotBlank())
        val comments = repo.comments(passage)
        assertTrue("O pacote real precisa conter os comentários já existentes de Gênesis 1", comments.isNotEmpty())
        assertTrue(repo.evidence(comments.first().text("id")).isNotEmpty())
        assertTrue(repo.trace(comments.first().text("id")).isNotEmpty())
        assertTrue(repo.documents().size >= 37)
        assertTrue(repo.search("princípio", edition).isNotEmpty())
        assertTrue(repo.ontology().isNotEmpty())
        val personalFile = File(context.filesDir, "personal.sqlite3")
        val notes = PersonalRepository(personalFile)
        val id = notes.save(null, "QA Android — preservação", "Anotação local de teste; não vem do pacote.", comments.first().text("id"))
        store.install(File(packagePath).inputStream())
        assertEquals(installed.id, store.current()!!.manifest.id)
        assertTrue(PersonalRepository(personalFile).list().any { it.text("id") == id })
        InstrumentationRegistry.getArguments().getString("patchPath")?.let { patch ->
            val updated = store.install(File(patch).inputStream())
            assertEquals(installed.id, updated.baseId)
            assertNotEquals(installed.id, updated.id)
            assertEquals("Gênesis", MobileRepository(store).books(edition).first { it.text("book_id") == "genesis" }.text("title"))
            assertTrue(PersonalRepository(personalFile).list().any { it.text("id") == id })
        }
    }

    @Test fun bundledSqliteSupportsCanonicalStrictTablesAndFts5() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val database = File(context.cacheDir, "sqlite-capabilities-${System.nanoTime()}.sqlite3")
        try {
            Sqlite.open(database, false).use { db ->
                db.rows("CREATE TABLE units(id TEXT PRIMARY KEY,text TEXT NOT NULL) STRICT")
                db.rows("CREATE VIRTUAL TABLE words USING fts5(text,tokenize='unicode61 remove_diacritics 2')")
                db.rows("INSERT INTO units VALUES(?,?)", listOf("DEMO:unit", "λόγος"))
                db.rows("INSERT INTO words VALUES(?)", listOf("princípio λόγος"))
                assertEquals("λόγος", db.rows("SELECT text FROM units WHERE id=?", listOf("DEMO:unit")).single().text("text"))
                assertTrue(db.rows("SELECT text FROM words WHERE words MATCH ?", listOf(ftsQuery("principio"))).isNotEmpty())
            }
            Sqlite.validate(database)
        } finally { database.delete() }
    }
}
