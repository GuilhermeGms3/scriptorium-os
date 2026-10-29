package org.scriptorium.app

import android.content.Context
import android.content.ContextWrapper
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.scriptorium.app.audio.AudioLibrary
import org.scriptorium.app.audio.NarrationEntry
import org.scriptorium.app.data.LocalTranslation

/** Isolated metadata store, never clears personal notes or the actual audio preferences. */
class AudioEditorialTest {
    @Test fun reflectionsSurviveHistoryRotationAndEditingDoesNotDuplicateTheProject() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("audioEditorialQa") == "true")
        val base = InstrumentationRegistry.getInstrumentation().targetContext
        val name = "editorial-qa-${java.util.UUID.randomUUID()}"
        val isolated = object : ContextWrapper(base) {
            override fun getSharedPreferences(ignored: String, mode: Int) = base.getSharedPreferences(name, Context.MODE_PRIVATE)
        }
        val library = AudioLibrary(isolated)
        fun reflection(text: String) = NarrationEntry.create("Roteiro QA", text, "pt-BR", JSONObject().put("kind", "reflection").put("projectId", "stable-qa").put("reviewed", true))
        try {
            val first = reflection("Texto autoral inicial para conferir persistência.")
            library.saveEntry(first)
            repeat(40) { index -> library.saveEntry(NarrationEntry.create("Leitura $index", "Texto pessoal número $index.", "pt-BR", JSONObject().put("kind", "personal"))) }
            assertEquals(31, library.entries().size)
            assertTrue(library.entries().any { it.id == first.id })
            val revised = reflection("Roteiro revisado; a identidade editorial é a mesma.")
            library.saveEntry(revised)
            assertEquals(1, library.entries().count { it.source.optString("kind") == "reflection" })
            assertFalse(library.entries().any { it.id == first.id })
            assertEquals(revised.id, AudioLibrary(isolated).entries().first().id)
            library.removeReflection(revised.id)
            assertEquals(30, library.entries().size)
        } finally { base.deleteSharedPreferences(name) }
    }

    @Test fun languageIdentificationWorksLocallyForPortugueseEnglishAndSpanish() = runBlocking {
        assumeTrue(InstrumentationRegistry.getArguments().getString("audioEditorialQa") == "true")
        assertEquals("pt", LocalTranslation.identify("No princípio criou Deus os céus e a terra. Este comentário explica o contexto histórico da passagem e sua interpretação."))
        assertEquals("en", LocalTranslation.identify("In the beginning God created the heavens and the earth. This commentary explains the historical context of the passage and its interpretation."))
        assertEquals("es", LocalTranslation.identify("En el principio creó Dios los cielos y la tierra. Este comentario explica el contexto histórico del pasaje y su interpretación."))
    }
}
