package org.scriptorium.app.data

/** Bounded by the reader's existing batch. Commit each result so failure never hides the rest. */
suspend fun translateReadingFeed(units: List<Row>, translate: suspend (String) -> String, publish: (String, String) -> Unit) {
    for (unit in units) {
        val text = unit.text("surface_text")
        if (text.isNotBlank()) publish(unit.text("id"), translate(text))
    }
}
