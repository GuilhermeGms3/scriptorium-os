package org.scriptorium.app

import android.util.AtomicFile
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Assume.assumeNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.data.PersonalRepository
import org.scriptorium.app.data.Sqlite
import java.io.File

/** Explicit private patch QA; does not run against a person's library unless a patch is supplied. */
@RunWith(AndroidJUnit4::class)
class PatchPersistenceTest {
    @Test fun patchPreservesPersonalDataAndIsIdempotent() {
        val path = InstrumentationRegistry.getArguments().getString("patchPath")
        assumeNotNull("QA privado exige -e patchPath.", path)
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val pointer = AtomicFile(File(context.filesDir, "active-content"))
        val store = ContentPackageStore(File(context.filesDir, "content"),
            { pointer.openRead().use { it.readBytes().toString(Charsets.UTF_8) } },
            { id ->
                val stream = pointer.startWrite()
                try { stream.write(id.toByteArray()); pointer.finishWrite(stream) }
                catch (failure: Exception) { pointer.failWrite(stream); throw failure }
            }, Sqlite::validate)
        val previous = requireNotNull(store.current()).second
        val personal = PersonalRepository(File(context.filesDir, "personal.sqlite3"))
        val before = personal.backup()
        val patch = File(requireNotNull(path))
        val installed = store.install(patch.inputStream())
        assertEquals(previous.id, installed.baseId)
        assertNotEquals(previous.id, installed.id)
        assertEquals(previous.files, installed.files)
        assertEquals(before, personal.backup())
        assertEquals(installed.id, store.install(patch.inputStream()).id)
        assertEquals(before, PersonalRepository(File(context.filesDir, "personal.sqlite3")).backup())
        assertEquals(installed.id, requireNotNull(store.current()).second.id)
    }
}
