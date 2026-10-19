package org.scriptorium.app

import android.util.AtomicFile
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.data.*
import java.io.File

/** Opt-in private QA. Reuses the automatically installed content; never imports a second copy. */
@RunWith(AndroidJUnit4::class)
class BundledLibraryTest {
    private fun installedStore(): ContentPackageStore {
        assumeTrue(InstrumentationRegistry.getArguments().getString("fullQa") == "true")
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val pointer = AtomicFile(File(context.filesDir, "active-content"))
        assertTrue("Abra o aplicativo e aguarde a instalação automática antes do QA privado.", pointer.baseFile.exists())
        return ContentPackageStore(File(context.filesDir, "content"), { pointer.openRead().use { it.readBytes().toString(Charsets.UTF_8) } }, { error("QA não altera geração") }, Sqlite::validate)
    }
    @Test fun fullBundledContentAndNativeQueries() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = installedStore()
        val (root, manifest) = requireNotNull(store.current())
        assertEquals(10, manifest.editions.size)
        assertEquals(57, manifest.files.count { it.path.endsWith(".pdf") })
        assertTrue(manifest.files.all { File(root, it.path).length() == it.size })
        val repository = MobileRepository(store)
        assertEquals(57, repository.documents().size)
        assertEquals(47707, repository.documents().sumOf { it.number("pages") })
        assertEquals(16, repository.catalog("guide").size)
        assertEquals(111, repository.catalog("lesson").size)
        assertEquals(52, requireNotNull(repository.catalogItem("nag-hammadi")).objects("texts").size)
        assertTrue(repository.primaryWorks().any { it["chapters"].isNullOrEmpty() })
        val edition = repository.editions().first { it.id == "biblia-livre-n4-2025.1.0" }
        val genesis = repository.books(edition).first { it.text("book_id") == "genesis" }
        val passage = Passage(edition, genesis.text("id"), "genesis", genesis.text("title"), 1, genesis.text("scheme"))
        assertEquals("scriptorium-bcv-1", passage.scheme)
        assertEquals(31, repository.verses(passage).size)
        assertTrue(repository.comments(passage).isNotEmpty())
        assertTrue(repository.parallel(passage).size >= 3)
        assertTrue(repository.search("princípio", edition).isNotEmpty())
        assertNotNull(repository.resolveReference("Gênesis 1:1", edition))
        val original = repository.originalEditions(passage).first()
        val unit = repository.verses(passage.copy(edition = original)).first()
        val tokens = repository.tokens(original, unit.text("id"))
        assertTrue(tokens.isNotEmpty())
        val lexical = tokens.first { repository.lexicalEntries(original, it).isNotEmpty() }
        assertTrue(repository.occurrences(original, lexical).isNotEmpty())
        assertTrue(repository.lexicalStatistics(original, lexical).first.isNotEmpty())
        repository.publicClaims().forEach { claim -> repository.arguments(claim.text("id")).forEach { repository.argumentDetail(it.text("id")) } }
        assertTrue(repository.traceEvents("", 0).isNotEmpty())
        val semantic = File(root, "semantic")
        val config = JSONObject(File(semantic, "config.json").readText())
        val tokenizer = WordPieceTokenizer(File(semantic, "vocab.txt").readLines())
        for (probe in config.objects("probes")) {
            val expectedIds = probe.getJSONArray("ids")
            assertArrayEquals("Tokenização: ${probe.getString("text")}", LongArray(expectedIds.length()) { expectedIds.getLong(it) }, tokenizer.encode(probe.getString("text")))
            val vector = OnDeviceSemantic.embedding(semantic, probe.getString("text"))
            val expected = probe.getJSONArray("vector")
            val similarity = vector.indices.sumOf { vector[it].toDouble() * expected.getDouble(it) }
            assertTrue("Consistência PC→Android: $similarity", similarity > 0.97)
        }
        val started = System.nanoTime()
        val hits = repository.semanticSearch("perdoar os inimigos", edition)
        println("SEMANTIC_QA ${(System.nanoTime() - started) / 1_000_000}ms ${hits.take(5).map { it.title }}")
        assertEquals(30, hits.size)
        val personal = PersonalRepository(File(context.filesDir, "personal.sqlite3"))
        assertTrue(personal.groups().size >= 3)
        if (InstrumentationRegistry.getArguments().getString("expectedUiNote") == "true") assertTrue("A atualização deve preservar a nota criada pelo editor nativo.", personal.list().any { it.text("title") == "Nota testada no Android" && it.text("body").contains("[[") })
        val id = personal.save(null, "QA persistente", "Nota criada no Android, não no pacote", null)
        assertTrue(PersonalRepository(File(context.filesDir, "personal.sqlite3")).list().any { it.text("id") == id })
    }
    @Test fun semanticRelevanceMustRecoverEnemyForgivenessContext() {
        val repository = MobileRepository(installedStore())
        val edition = repository.editions().first { it.id == "biblia-livre-n4-2025.1.0" }
        val hits = repository.semanticSearch("perdoar os inimigos", edition)
        assertTrue("A consulta de perdão aos inimigos precisa recuperar o Sermão da Montanha/Planície, não apenas hostilidade a inimigos. Este gate permanece pendente até calibrar a recuperação.", hits.any { it.passage?.bookId in listOf("matthew", "luke") && it.passage?.chapter in listOf(5, 6) })
    }
}
