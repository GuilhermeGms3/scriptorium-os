package org.scriptorium.app.content

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class ContentPackageTest {
    @get:Rule val temporary = TemporaryFolder()
    private var active: String? = null
    private val first = "a".repeat(64)
    private val second = "b".repeat(64)
    private fun hash(text: String) = MessageDigest.getInstance("SHA-256").digest(text.toByteArray()).joinToString("") { "%02x".format(it) }
    private fun manifest(id: String = first, body: String = "fixture-content", base: String? = null): JSONObject = JSONObject()
        .put("format", "scriptorium-mobile-v1").put("schemaVersion", 1).put("id", id)
        .put("files", JSONArray().put(JSONObject().put("path", "content.sqlite3").put("sha256", hash(body)).put("size", body.length))
            .put(JSONObject().put("path", "corpus/demo.sqlite3").put("sha256", hash("fixture-corpus")).put("size", 14)))
        .put("editions", JSONArray().put(JSONObject().put("id", "DEMO").put("title", "DEMO test only").put("path", "corpus/demo.sqlite3")))
        .also { if (base != null) it.put("baseId", base) }
    private fun archive(json: JSONObject, entries: Map<String, String>): ByteArrayInputStream {
        val bytes = ByteArrayOutputStream()
        ZipOutputStream(bytes).use { zip ->
            zip.putNextEntry(ZipEntry("manifest.json")); zip.write(json.toString().toByteArray()); zip.closeEntry()
            entries.forEach { (name, value) -> zip.putNextEntry(ZipEntry(name)); zip.write(value.toByteArray()); zip.closeEntry() }
        }
        return ByteArrayInputStream(bytes.toByteArray())
    }
    private fun full(json: JSONObject = manifest()) = archive(json, mapOf("content.sqlite3" to "fixture-content", "corpus/demo.sqlite3" to "fixture-corpus"))
    private fun store(validator: (File) -> Unit = {}) = ContentPackageStore(File(temporary.root, "content"), { active }, { active = it }, validator)
    @Test fun fullInstallAndRestartPreserveCanonicalIds() {
        store().install(full())
        assertEquals(first, store().current()!!.second.id)
        assertEquals("DEMO", store().current()!!.second.editions.single().id)
    }
    @Test fun patchCopiesOnlyUnchangedFilesAndDoesNotTouchNotes() {
        val notes = File(temporary.root, "personal.sqlite3").apply { writeText("my notes") }
        val target = store(); target.install(full())
        target.install(archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content")))
        assertEquals(second, active)
        assertEquals("fixture-corpus", File(target.current()!!.first, "corpus/demo.sqlite3").readText())
        assertEquals("my notes", notes.readText())
    }
    @Test fun repeatedInstallIsIdempotent() {
        val target = store(); target.install(full()); target.install(full())
        assertEquals(1, File(temporary.root, "content").listFiles()!!.size)
    }
    @Test fun corruptChecksumPreservesActiveGeneration() {
        val target = store(); target.install(full())
        assertThrows(IllegalArgumentException::class.java) {
            target.install(archive(manifest(second, "bad", first), mapOf("content.sqlite3" to "BAD")))
        }
        assertEquals(first, active)
        assertTrue(File(temporary.root, "content").listFiles()!!.none { it.name.startsWith(".install") })
    }
    @Test fun wrongPatchBaseIsRejected() {
        val target = store(); target.install(full())
        assertThrows(IllegalArgumentException::class.java) { target.install(archive(manifest(second, "new", "c".repeat(64)), emptyMap())) }
        assertEquals(first, active)
    }
    @Test fun archiveCannotWriteOutsideContent() {
        val target = store()
        assertThrows(IllegalStateException::class.java) { target.install(archive(manifest(), mapOf("../personal.sqlite3" to "bad"))) }
        assertNull(active)
    }
    @Test fun oversizedEntryAndMissingFullFileAreRejected() {
        assertThrows(IllegalArgumentException::class.java) { store().install(archive(manifest(), mapOf("content.sqlite3" to "x".repeat(100)))) }
        assertThrows(IllegalArgumentException::class.java) { store().install(archive(manifest(), emptyMap())) }
        assertNull(active)
    }
    @Test fun databaseValidationFailureDoesNotActivate() {
        assertThrows(IllegalStateException::class.java) { store { error("invalid SQLite") }.install(full()) }
        assertNull(active)
    }
    @Test fun schemaAndPathValidationAreExplicit() {
        assertThrows(IllegalArgumentException::class.java) { ContentManifest.parse(manifest().put("schemaVersion", 2).toString()) }
        assertFalse(ContentManifest.safePath("corpus/../notes.sqlite3"))
        assertFalse(ContentManifest.safePath("C:\\notes.sqlite3"))
        assertFalse(ContentManifest.safePath("personal.sqlite3"))
        assertTrue(ContentManifest.safePath("documents/${"a".repeat(64)}.pdf"))
    }
    @Test fun interruptedActivationRetainsOldPointer() {
        val target = store(); target.install(full())
        val failing = ContentPackageStore(File(temporary.root, "content"), { active }, { error("disk failure") }, {})
        assertThrows(IllegalStateException::class.java) { failing.install(archive(manifest(second, "new", first), mapOf("content.sqlite3" to "new"))) }
        assertEquals(first, active)
    }
}
