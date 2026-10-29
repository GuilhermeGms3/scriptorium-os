package org.scriptorium.app.data

import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.CancellationException
import org.junit.Assert.*
import org.junit.Test

class ReadingPanelTest {
    @Test fun groupingPreservesEveryExcerptAndItsLocatorInSourceOrder() {
        val rows = listOf(
            mapOf("id" to "a", "document_id" to "geneva", "source_title" to "Genebra", "body" to "Primeiro", "page_index" to "12"),
            mapOf("id" to "b", "document_id" to "shedd", "source_title" to "Shedd"),
            mapOf("id" to "c", "document_id" to "geneva", "source_title" to "Genebra", "body" to "Segundo", "page_index" to "13"))
        val grouped = commentsBySource(rows)
        assertEquals(listOf(listOf("a", "c"), listOf("b")), grouped.map { group -> group.map { it.text("id") } })
        assertEquals(rows.toSet(), grouped.flatten().toSet())
        assertEquals("13", grouped.first().last().text("page_index"))
        assertEquals(2, commentsBySource(listOf(mapOf("id" to "a", "document_id" to "one", "source_title" to "Mesmo título"), mapOf("id" to "b", "document_id" to "two", "source_title" to "Mesmo título"))).size)
        assertTrue(commentsBySource(emptyList()).isEmpty())
    }
    @Test fun dockCanGrowAndShrinkWithoutCoveringTheEntireReading() {
        assertEquals(0.68f, resizedCommentDock(0.48f, 0.2f), 0.001f)
        assertEquals(0.38f, resizedCommentDock(0.48f, -0.1f), 0.001f)
        assertEquals(0.75f, resizedCommentDock(0.48f, 1f))
        assertEquals(0.25f, resizedCommentDock(0.48f, -1f))
    }
    @Test fun oneTranslationActionProcessesTheWholeFeedWithStableUnitIds() = runBlocking {
        val units = (1..80).map { mapOf("id" to "unit:$it", "surface_text" to "Text $it") }
        val output = linkedMapOf<String, String>()
        translateReadingFeed(units, { "PT $it" }) { id, text -> output[id] = text }
        assertEquals(80, output.size)
        assertEquals("PT Text 80", output["unit:80"])
        assertEquals("Text 1", units.first().text("surface_text"))
    }
    @Test fun interruptedFeedRetainsCompletedUnitsAndPropagatesCancellation() = runBlocking {
        val units = (1..4).map { mapOf("id" to "$it", "surface_text" to "Text $it") }
        val output = linkedMapOf<String, String>()
        try {
            translateReadingFeed(units, { if (it == "Text 3") throw CancellationException("stop") else "PT $it" }) { id, text -> output[id] = text }
            fail("Cancellation must propagate")
        } catch (_: CancellationException) { assertEquals(setOf("1", "2"), output.keys) }
    }
}
