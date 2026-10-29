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

/** Inferred display paragraphs, never citation offsets or purported authorial divisions. */
fun libraryReadingSections(raw: String): List<String> {
    val blocks = readingParagraphs(raw).split(Regex("\n{2,}"))
    return blocks.flatMap { block ->
        val result = mutableListOf<String>()
        val current = StringBuilder()
        // A sentence boundary is preferable to arbitrary character/word wrapping.
        block.split(Regex("(?<=[.!?;])\\s+(?=[A-ZÀ-ÖØ-Þ\"“‘])")).forEach { sentence ->
            if (current.length >= 420) { result += current.toString(); current.clear() }
            if (current.isNotEmpty()) current.append(' ')
            current.append(sentence)
        }
        if (current.isNotBlank()) result += current.toString().trim()
        result
    }.filter(String::isNotBlank)
}

/** A bounded contiguous window keeps the active section reachable, even in long books. */
fun readingIndicatorWindow(count: Int, selected: Int, capacity: Int): IntRange {
    if (count <= 0 || capacity <= 0) return IntRange.EMPTY
    val size = minOf(count, capacity)
    val start = (selected.coerceIn(0, count - 1) - size / 2).coerceIn(0, count - size)
    return start until start + size
}

/** Ignore a sliver of the preceding verse; keep a fully visible short verse as the anchor. */
fun readingAnchor(items: List<VisibleReadingItem>, start: Int, end: Int): Int? {
    fun visible(item: VisibleReadingItem) = (minOf(item.offset + item.size, end) - maxOf(item.offset, start)).coerceAtLeast(0)
    return items.firstOrNull { visible(it) >= minOf(it.size * 0.5f, (end - start) * 0.5f) }
        ?.index ?: items.maxByOrNull(::visible)?.index
}
