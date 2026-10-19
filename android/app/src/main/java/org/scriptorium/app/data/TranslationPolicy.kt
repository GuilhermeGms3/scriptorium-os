package org.scriptorium.app.data

import org.json.JSONObject

object TranslationPolicy {
    fun chunks(text: String, maximum: Int = 2500): List<String> {
        require(maximum >= 100)
        val chunks = mutableListOf<String>()
        var remaining = text
        while (remaining.length > maximum) {
            val candidate = remaining.take(maximum)
            val boundary = maxOf(candidate.lastIndexOf('\n'), candidate.lastIndexOf(". "), candidate.lastIndexOf("; "))
                .takeIf { it >= maximum / 2 } ?: candidate.lastIndexOf(' ').takeIf { it > 0 } ?: maximum
            chunks.add(remaining.take(boundary))
            remaining = remaining.drop(boundary)
        }
        if (remaining.isNotEmpty()) chunks.add(remaining)
        return chunks
    }
    /** Translate spans between protected terms, never rely on an engine preserving placeholders. */
    fun translate(text: String, glossary: JSONObject, engine: (String) -> String): String {
        fun span(value: String): String {
            val core = value.trim()
            if (core.isEmpty()) return value
            return value.takeWhile(Char::isWhitespace) + engine(core).trim() + value.takeLastWhile(Char::isWhitespace)
        }
        val rules = glossary.objects("rules").sortedByDescending { it.getString("source").length }
        val pattern = Regex("(?<![\\p{L}\\p{N}])(?:${rules.joinToString("|") { Regex.escape(it.getString("source")) }})(?![\\p{L}\\p{N}])")
        return chunks(text).joinToString("") { chunk ->
            val output = StringBuilder(); var cursor = 0
            for (match in pattern.findAll(chunk)) {
                val prior = chunk.substring(cursor, match.range.first)
                output.append(span(prior))
                output.append(rules.first { it.getString("source") == match.value }.getString("target"))
                cursor = match.range.last + 1
            }
            val rest = chunk.substring(cursor)
            output.append(span(rest))
            output.toString()
        }
    }
}
