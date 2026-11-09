package org.scriptorium.app.data

/** Learning prerequisites only; Scripture and library access are never gated. */
class StudyTreeProgress(
    private val parents: Map<String, List<String>>,
    private val completed: Set<String>,
    private val origin: String = "study-origin"
) {
    fun done(id: String): Boolean = id in completed
    fun unlocked(id: String): Boolean = available(id, emptySet())
    private fun available(id: String, visited: Set<String>): Boolean {
        if (id == origin) return true
        if (id in visited || id !in parents || parents[id].isNullOrEmpty()) return false
        // Previously completed studies remain available for review, including imported progress.
        if (done(id)) return true
        return parents.getValue(id).all { done(it) && available(it, visited + id) }
    }
    fun missing(id: String): List<String> = parents[id].orEmpty().filter { !done(it) || !unlocked(it) }
}
