package org.scriptorium.app.data

/** Presentation only: retain the raw text and its offsets for evidence and library navigation. */
fun readingParagraphs(raw: String): String = raw.replace("\r\n", "\n").replace('\r', '\n')
    .split(Regex("\n[\t ]*\n+"))
    .joinToString("\n\n") { block ->
        val lines = block.lines().map(String::trim).filter(String::isNotEmpty)
        buildString {
            lines.forEachIndexed { index, line ->
                if (index > 0) {
                    val previous = lines[index - 1]
                    val heading = previous.length < 65 && !previous.last().isLetterOrDigit() && previous.last() == ':'
                    val number = previous.matches(Regex("\\d{1,4}"))
                    val listItem = line.matches(Regex("^(?:[-•]|\\d+[.)])\\s+.*"))
                    append(if (heading || number || listItem) "\n" else " ")
                }
                append(line)
            }
        }
    }.trim()

data class VisibleReadingItem(val index: Int, val offset: Int, val size: Int)

/** Ignore a sliver of the preceding verse; keep a fully visible short verse as the anchor. */
fun readingAnchor(items: List<VisibleReadingItem>, start: Int, end: Int): Int? {
    fun visible(item: VisibleReadingItem) = (minOf(item.offset + item.size, end) - maxOf(item.offset, start)).coerceAtLeast(0)
    return items.firstOrNull { visible(it) >= minOf(it.size * 0.5f, (end - start) * 0.5f) }
        ?.index ?: items.maxByOrNull(::visible)?.index
}
