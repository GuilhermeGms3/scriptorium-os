package org.scriptorium.app.data

/** Matches the pinned cased BERT tokenizer's clean-text, punctuation and WordPiece recipe. */
class WordPieceTokenizer(vocabulary: List<String>) {
    private val vocab = vocabulary.withIndex().associate { it.value to it.index.toLong() }
    private val unknown = requireNotNull(vocab["[UNK]"])
    fun encode(text: String, maximum: Int = 96): LongArray {
        require(maximum in 2..512)
        val words = mutableListOf<String>()
        val current = StringBuilder()
        fun flush() { if (current.isNotEmpty()) { words.add(current.toString()); current.clear() } }
        val points = text.codePoints().toArray()
        for (point in points) {
            val type = Character.getType(point)
            when {
                point == 0 || point == 0xfffd -> Unit
                Character.isWhitespace(point) || Character.isSpaceChar(point) -> flush()
                type == Character.CONTROL.toInt() || type == Character.FORMAT.toInt() -> Unit
                isChinese(point) || isPunctuation(point) -> { flush(); words.add(String(Character.toChars(point))) }
                else -> current.appendCodePoint(point)
            }
        }
        flush()
        val result = mutableListOf(requireNotNull(vocab["[CLS]"]))
        for (word in words) {
            if (result.size >= maximum - 1) break
            if (word.codePointCount(0, word.length) > 100) { result.add(unknown); continue }
            val pieces = mutableListOf<Long>()
            var start = 0
            var invalid = false
            while (start < word.length) {
                var end = word.length
                var token: Long? = null
                while (end > start) {
                    token = vocab[(if (start > 0) "##" else "") + word.substring(start, end)]
                    if (token != null) break
                    end--
                }
                if (token == null) { invalid = true; break }
                pieces.add(token); start = end
            }
            if (invalid) result.add(unknown) else result.addAll(pieces.take(maximum - 1 - result.size))
        }
        result.add(requireNotNull(vocab["[SEP]"]))
        return result.toLongArray()
    }
    private fun isPunctuation(point: Int): Boolean = point in 33..47 || point in 58..64 || point in 91..96 || point in 123..126 || Character.getType(point) in setOf(Character.CONNECTOR_PUNCTUATION.toInt(), Character.DASH_PUNCTUATION.toInt(), Character.START_PUNCTUATION.toInt(), Character.END_PUNCTUATION.toInt(), Character.INITIAL_QUOTE_PUNCTUATION.toInt(), Character.FINAL_QUOTE_PUNCTUATION.toInt(), Character.OTHER_PUNCTUATION.toInt())
    private fun isChinese(point: Int): Boolean = point in 0x4e00..0x9fff || point in 0x3400..0x4dbf || point in 0x20000..0x2a6df || point in 0x2a700..0x2b73f || point in 0x2b740..0x2b81f || point in 0x2b820..0x2ceaf || point in 0xf900..0xfaff || point in 0x2f800..0x2fa1f
}
