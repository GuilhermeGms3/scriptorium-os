package org.scriptorium.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.scriptorium.app.data.*
import java.io.File

@RunWith(AndroidJUnit4::class)
class PersonalDataTest {
    private fun temporary() = File(InstrumentationRegistry.getInstrumentation().targetContext.cacheDir, "personal-test-${System.nanoTime()}.sqlite3")

    @Test fun additiveMigrationPreservesV1Notes() {
        val file = temporary()
        try {
            Sqlite.open(file, false).use { db ->
                db.rows("CREATE TABLE notes(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,source_id TEXT,updated_at TEXT NOT NULL)")
                db.rows("INSERT INTO notes VALUES('old','Anterior','Conteúdo anterior',NULL,'2026-01-01')")
                db.rows("PRAGMA user_version=1")
            }
            val personal = PersonalRepository(file)
            assertEquals("Conteúdo anterior", personal.list().single().text("body"))
            assertEquals(1, personal.list().single().number("version"))
            assertTrue(personal.groups().isEmpty())
        } finally { file.delete() }
    }

    @Test fun foldersLinksAndBackupRoundtripAreIdempotent() {
        val source = temporary(); val destination = temporary()
        try {
            val personal = PersonalRepository(source)
            val group = personal.createGroup("Pesquisa", "#aabbcc")
            personal.createFolder(group, null, "Raiz")
            val folder = personal.folders(group).single().text("id")
            personal.createFolder(group, folder, "Filha")
            val target = personal.save(null, "Destino", "Uma nota", null)
            val note = personal.save(null, "Origem", "[[${target}|Destino]] `[[inexistente]]`", "DEMO:source")
            personal.placeNote(note, group, folder, "#abcdef")
            personal.connect(note, target)
            assertEquals(2, personal.edges().size)
            personal.save(note, "Origem", "Sem referência agora", "DEMO:source")
            assertEquals("manual", personal.edges().single().text("kind"))
            personal.saveProgress("course", 1, "m1", "{}", true)
            val backup = personal.backup()
            val restored = PersonalRepository(destination)
            restored.restore(backup); restored.restore(backup)
            assertEquals(2, restored.list().size)
            assertEquals(2, restored.folders(group).size)
            assertEquals(note, restored.notes(group, folder).single().text("id"))
            assertEquals(1, restored.edges().size)
            assertFalse(restored.progress("course", 1).single().text("completed_at").isBlank())
            Sqlite.open(destination).use { assertTrue(it.rows("PRAGMA foreign_key_check").isEmpty()) }
        } finally { source.delete(); destination.delete() }
    }

    @Test fun desktopSeedDoesNotOverwritePersonalChanges() {
        val file = temporary()
        try {
            val personal = PersonalRepository(file)
            val seed = """{"studies":[{"id":"g","title":"Grupo"}],"notes":[{"id":"n","title":"Antiga","content":"Texto","updated_at":"2026-01-01"}]}"""
            personal.importDesktopSeed(seed)
            personal.save("n", "Editada no telefone", "Nova", null)
            personal.importDesktopSeed(seed)
            assertEquals("Editada no telefone", personal.list().single().text("title"))
            assertEquals(1, personal.groups().size)
        } finally { file.delete() }
    }
}
