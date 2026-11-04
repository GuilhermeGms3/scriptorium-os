package org.scriptorium.app.ui

import org.junit.Assert.*
import org.junit.Test

class KnowledgeLayoutTest {
    private fun link(from: String, to: String) = mapOf("from_entity_id" to from, "to_entity_id" to to)

    @Test fun eachGroupOfLinkedThemesGetsItsOwnRowWithTheHubInTheMiddle() {
        val relations = listOf(link("doctrine:atonement", "topic:atonement"), link("theory:two-source", "theory:farrer"), link("theory:two-source", "theory:griesbach"))
        val ids = relations.flatMap { listOf(it.getValue("from_entity_id"), it.getValue("to_entity_id")) }.distinct()
        val layout = linkedLayout(ids, relations).associate { (id, x, y) -> id to (x to y) }
        assertEquals(ids.toSet(), layout.keys)
        // Lines stay horizontal: linked themes share a row; separate groups do not.
        assertEquals(layout.getValue("doctrine:atonement").second, layout.getValue("topic:atonement").second, 0f)
        assertEquals(layout.getValue("theory:two-source").second, layout.getValue("theory:farrer").second, 0f)
        assertNotEquals(layout.getValue("topic:atonement").second, layout.getValue("theory:farrer").second)
        // The theory the other two compete with sits between them.
        val (hub, farrer, griesbach) = listOf("theory:two-source", "theory:farrer", "theory:griesbach").map { layout.getValue(it).first }
        assertTrue(hub > minOf(farrer, griesbach) && hub < maxOf(farrer, griesbach))
    }

    @Test fun aLoneThemeIsCentred() {
        assertEquals(listOf(Triple("topic:canon", 540f, 380f)), linkedLayout(listOf("topic:canon"), emptyList()))
    }
}
