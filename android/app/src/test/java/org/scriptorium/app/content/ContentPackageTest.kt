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
        assertEquals(first, store().current()!!.manifest.id)
        assertEquals("DEMO", store().current()!!.manifest.editions.single().id)
    }
    @Test fun patchReusesUnchangedFilesAndDoesNotTouchNotes() {
        val notes = File(temporary.root, "personal.sqlite3").apply { writeText("my notes") }
        val target = store(); target.install(full())
        target.install(archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content")))
        assertEquals(second, active)
        assertEquals("fixture-corpus", target.current()!!.file("corpus/demo.sqlite3").readText())
        assertEquals("my notes", notes.readText())
    }
    @Test fun repeatedInstallIsIdempotent() {
        val target = store(); target.install(full()); target.install(full())
        assertEquals(1, File(temporary.root, "content").listFiles()!!.count { it.isDirectory })
    }
    @Test fun identicalIdentifierCannotReplaceContentMetadata() {
        val target = store(); target.install(full())
        assertThrows(IllegalArgumentException::class.java) { target.install(archive(manifest(first, "different bytes"), emptyMap())) }
        assertEquals("fixture-content", target.current()!!.file("content.sqlite3").readText())
    }
    @Test fun sameHashDatabaseIsReusedButIncomingCorruptionStillFails() {
        var validations = 0
        val target = store { validations++ }
        target.install(full())
        assertEquals(2, validations)
        val patch = manifest(second, "fixture-content", first)
        target.install(archive(patch, emptyMap()))
        assertEquals(2, validations)
        val bad = manifest("c".repeat(64), "fixture-content", second)
        assertThrows(IllegalArgumentException::class.java) {
            target.install(archive(bad, mapOf("content.sqlite3" to "WRONG-content!!")))
        }
        assertEquals(second, active)
        assertEquals("fixture-content", target.current()!!.file("content.sqlite3").readText())
    }
    @Test fun separateInstallersCannotWriteConcurrently() {
        var blocked = false
        val target = store {
            assertThrows(IllegalStateException::class.java) { store().install(full()) }
            blocked = true
        }
        target.install(full())
        assertTrue(blocked)
        assertEquals(first, active)
    }
    @Test fun interruptedStagingIsReclaimedWithoutTouchingPersonalData() {
        val root = File(temporary.root, "content").apply { mkdirs() }
        val stale = File(root, ".install-${java.util.UUID.randomUUID()}").apply { mkdir() }
        File(stale, "partial").writeText("partial copy")
        val notes = File(temporary.root, "personal.sqlite3").apply { writeText("preserve") }
        store().install(full())
        assertFalse(stale.exists())
        assertEquals("preserve", notes.readText())
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
    @Test fun metadataPatchReferencesExactlyTheSamePhysicalFilesWithoutHardlinksOrCopies() {
        val target = store(); target.install(full())
        val before = target.current()!!.files
        target.install(archive(manifest(second, base = first), emptyMap()))
        assertEquals(before, target.current()!!.files)
        assertFalse(File(temporary.root, "content/$first/manifest.json").exists())
        assertFalse(File(temporary.root, "content/$second/content.sqlite3").exists())
        assertTrue(File(temporary.root, "content/$second/locations.json").exists())
        assertEquals("fixture-content", target.current()!!.file("content.sqlite3").readText())
    }
    @Test fun repeatedPatchesDoNotAccumulateContentOrManifestChains() {
        val target = store(); target.install(full())
        val original = target.current()!!.files
        var base = first
        for (letter in 'b'..'f') {
            val id = letter.toString().repeat(64)
            target.install(archive(manifest(id, base = base), emptyMap()))
            assertEquals(original, target.current()!!.files)
            base = id
        }
        val files = File(temporary.root, "content").walk().filter(File::isFile).toList()
        assertEquals(2, files.count { it.extension == "sqlite3" })
        assertEquals(1, files.count { it.name == "manifest.json" })
        assertEquals(1, files.count { it.name == "locations.json" })
    }
    @Test fun changedBytesAreReclaimedOnlyAfterConfirmedActivation() {
        val target = store(); target.install(full())
        val before = target.current()!!
        val notes = File(temporary.root, "personal.sqlite3").apply { writeText("preserve notes") }
        var observed = false
        val updater = ContentPackageStore(File(temporary.root, "content"), { active }, { id ->
            assertTrue(before.file("content.sqlite3").exists())
            assertEquals("fixture-content", before.file("content.sqlite3").readText())
            active = id; observed = true
        }, {})
        updater.install(archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content")))
        assertTrue(observed)
        assertFalse(before.file("content.sqlite3").exists())
        assertEquals(before.file("corpus/demo.sqlite3"), updater.current()!!.file("corpus/demo.sqlite3"))
        assertEquals("preserve notes", notes.readText())
    }
    @Test fun migrationOfExistingCopiedGenerationsNeedsNoExtraAcervoSpace() {
        val root = File(temporary.root, "content").apply { mkdirs() }
        for (id in listOf(first, second)) {
            val dir = File(root, id).apply { mkdir() }
            File(dir, "manifest.json").writeText(manifest(id).toString())
            File(dir, "content.sqlite3").writeText("fixture-content")
            File(dir, "corpus").mkdir()
            File(dir, "corpus/demo.sqlite3").writeText("fixture-corpus")
        }
        active = second
        val target = ContentPackageStore(root, { active }, { active = it }, {}, { 64 * 1024 * 1024L + 1 })
        target.maintain()
        assertFalse(File(root, first).exists())
        val previous = target.current()!!.files
        target.install(archive(manifest("c".repeat(64), base = second), emptyMap()))
        assertEquals(previous, target.current()!!.files)
    }
    @Test fun spaceReservationCountsChangedFilesAndPreservesActiveOnInsufficientSpace() {
        val target = store(); target.install(full())
        val restricted = ContentPackageStore(File(temporary.root, "content"), { active }, { active = it }, {}, { 64 * 1024 * 1024L + 1 })
        assertThrows(IllegalArgumentException::class.java) {
            restricted.install(archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content")))
        }
        assertEquals(first, active)
        assertEquals("fixture-content", target.current()!!.file("content.sqlite3").readText())
        restricted.install(archive(manifest(second, base = first), emptyMap()))
        assertEquals(second, active)
    }
    @Test fun activationFailureAndStartupRecoveryKeepPriorFilesAndPersonalData() {
        val target = store(); target.install(full())
        val old = target.current()!!.files
        val updater = ContentPackageStore(File(temporary.root, "content"), { active }, { error("interrupted") }, {})
        assertThrows(IllegalStateException::class.java) { updater.install(archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content"))) }
        assertEquals(first, active)
        target.maintain()
        assertFalse(File(temporary.root, "content/$second").exists())
        assertTrue(old.values.all(File::exists))
    }
    @Test fun missingActiveFileStopsCollectionBeforeRemovingOtherRecoverableCopies() {
        val target = store(); target.install(full())
        val recovery = File(temporary.root, "content/$second").apply { mkdir() }
        File(recovery, "content.sqlite3").writeText("recovery copy")
        target.current()!!.file("content.sqlite3").delete()
        assertThrows(IllegalArgumentException::class.java) { target.maintain() }
        assertTrue(File(recovery, "content.sqlite3").exists())
    }
    @Test fun localFileMapCannotReadOrCollectOutsideTheContentRoot() {
        val target = store(); target.install(full())
        val note = File(temporary.root, "personal.sqlite3").apply { writeText("personal") }
        val map = File(temporary.root, "content/$first/locations.json")
        val index = JSONObject(map.readText())
        index.getJSONObject("files").put("content.sqlite3", "../personal.sqlite3")
        map.writeText(index.toString())
        assertThrows(IllegalArgumentException::class.java) { target.maintain() }
        assertEquals("personal", note.readText())
    }
    @Test fun collectorDoesNotDeleteUnexpectedPersonalFilesInsideAnOldDirectory() {
        val target = store(); target.install(full())
        val note = File(temporary.root, "content/$first/personal.sqlite3").apply { writeText("unexpected but protected") }
        target.install(archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content")))
        assertEquals("unexpected but protected", note.readText())
    }
    @Test fun fullPackageAuthenticatesRedundantFilesWithoutAllocatingAnotherCopy() {
        val target = store(); target.install(full())
        val old = target.current()!!.files
        target.install(full(manifest(second)))
        assertEquals(old, target.current()!!.files)
        assertThrows(IllegalArgumentException::class.java) { target.install(archive(manifest("c".repeat(64)), mapOf("content.sqlite3" to "fixture-content"))) }
    }

    @Test fun unconfirmedActivationNeverCollectsThePriorActiveFiles() {
        val target = store(); target.install(full())
        val old = target.current()!!.files
        val updater = ContentPackageStore(File(temporary.root, "content"), { active }, { /* Simulate a pointer write that was not committed. */ }, {})
        assertThrows(IllegalStateException::class.java) {
            updater.install(archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content")))
        }
        assertEquals(first, active)
        assertTrue(old.values.all(File::exists))
        assertEquals("fixture-content", target.current()!!.file("content.sqlite3").readText())
    }

    @Test fun inFlightReadFinishesBeforeAnUpdateCanCollectItsFiles() {
        val target = store(); target.install(full())
        val old = target.current()!!.file("content.sqlite3")
        val entered = java.util.concurrent.CountDownLatch(1)
        val release = java.util.concurrent.CountDownLatch(1)
        val started = java.util.concurrent.CountDownLatch(1)
        val finished = java.util.concurrent.CountDownLatch(1)
        val failure = java.util.concurrent.atomic.AtomicReference<Throwable>()
        val patch = archive(manifest(second, "new content", first), mapOf("content.sqlite3" to "new content"))
        val reader = kotlin.concurrent.thread {
            try { target.readCurrent {
                entered.countDown()
                check(release.await(5, java.util.concurrent.TimeUnit.SECONDS))
                assertEquals("fixture-content", old.readText())
            } } catch (error: Throwable) { failure.set(error) }
        }
        assertTrue(entered.await(5, java.util.concurrent.TimeUnit.SECONDS))
        val writer = kotlin.concurrent.thread {
            started.countDown()
            try { target.install(patch) } catch (error: Throwable) { failure.set(error) }
            finally { finished.countDown() }
        }
        try {
            assertTrue(started.await(5, java.util.concurrent.TimeUnit.SECONDS))
            assertFalse(finished.await(100, java.util.concurrent.TimeUnit.MILLISECONDS))
        } finally { release.countDown() }
        reader.join(5000); writer.join(5000)
        assertFalse(reader.isAlive || writer.isAlive)
        assertNull(failure.get())
        assertFalse(old.exists())
        assertEquals("new content", target.current()!!.file("content.sqlite3").readText())
    }

}
