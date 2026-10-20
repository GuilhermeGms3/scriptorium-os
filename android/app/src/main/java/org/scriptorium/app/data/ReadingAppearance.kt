package org.scriptorium.app.data

enum class ReadingFont(val label: String) { SERIF("Serifa clássica"), SANS("Sem serifa"), MONO("Monoespaçada") }
enum class ReadingTheme(val label: String) { DARK("Preto"), GRAY("Cinza"), BROWN("Marrom"), LIGHT("Claro") }
data class ReadingAppearance(val font: ReadingFont = ReadingFont.SERIF, val size: Int = 22,
    val theme: ReadingTheme = ReadingTheme.DARK, val dockedComments: Boolean = false, val motion: Boolean = true) {
    fun normalized() = copy(size = size.coerceIn(18, 32))
}

data class CommentGroup(val verse: Int?, val comments: List<Row>)
fun filterComments(comments: List<Row>, category: String?, document: String?): List<Row> = comments.filter {
    (category == null || category in it.commentCategories() || category == "Exegese e comentário bíblico" && it.commentCategories().any { name -> name in setOf("Exegese", "Comentário bíblico") }) &&
        (document == null || it.text("document_id") == document)
}
/** The dock changes presentation only; exact address identity is shared with inline comments. */
fun commentGroups(passage: Passage, verses: List<Row>, comments: List<Row>, targets: Map<String, List<Row>>): List<CommentGroup> = buildList {
    val context = comments.filter { comment -> commentApplies(passage, targets[comment.text("id")].orEmpty().filter { it["verse_start"] == null }, true) }
    if (context.isNotEmpty()) add(CommentGroup(null, context))
    verses.forEach { verse ->
        val linked = comments.filter { commentApplies(passage.copy(verse = verse.number("verse_start"), verseEnd = verse.number("verse_end").coerceAtLeast(verse.number("verse_start"))), targets[it.text("id")].orEmpty()) }
        if (linked.isNotEmpty()) add(CommentGroup(verse.number("verse_start"), linked))
    }
}
