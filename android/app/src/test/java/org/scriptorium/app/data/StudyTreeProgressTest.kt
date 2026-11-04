package org.scriptorium.app.data

import org.junit.Assert.*
import org.junit.Test

class StudyTreeProgressTest {
    private val parents = mapOf("bible" to listOf("study-origin"), "exegesis" to listOf("bible"), "theology" to listOf("study-origin"))
    @Test fun conceptsRequireTheirPredecessorsAndKeepOtherBranchesIndependent() {
        val initial = StudyTreeProgress(parents, emptySet())
        assertTrue(initial.unlocked("study-origin"))
        assertFalse(initial.unlocked("bible"))
        assertFalse(initial.unlocked("exegesis"))
        assertEquals(listOf("bible"), initial.missing("exegesis"))
        val first = StudyTreeProgress(parents, setOf("study-origin"))
        assertTrue(first.unlocked("bible"))
        assertTrue(first.unlocked("theology"))
        assertFalse(first.unlocked("exegesis"))
        assertTrue(StudyTreeProgress(parents, setOf("study-origin", "bible")).unlocked("exegesis"))
    }
    @Test fun importedCompletionRemainsAvailableForReviewButDoesNotFabricateParentCompletion() {
        val state = StudyTreeProgress(parents, setOf("exegesis"))
        assertTrue(state.done("exegesis"))
        assertTrue(state.unlocked("exegesis"))
        assertFalse(state.done("bible"))
        assertFalse(state.unlocked("bible"))
    }
    @Test fun malformedNodesAndCyclesDoNotOpenNewConcepts() {
        assertFalse(StudyTreeProgress(parents, emptySet()).unlocked("unknown"))
        assertFalse(StudyTreeProgress(mapOf("x" to listOf("y"), "y" to listOf("x")), emptySet()).unlocked("x"))
        assertFalse(StudyTreeProgress(mapOf("x" to emptyList()), emptySet()).unlocked("x"))
    }
}
