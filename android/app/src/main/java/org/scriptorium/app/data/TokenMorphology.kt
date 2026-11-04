package org.scriptorium.app.data

import org.json.JSONArray
import org.json.JSONObject

data class TokenMorphology(val code: String, val description: String)

/** Decode exported linguistic annotations for display; never print their JSON in the reader. */
fun tokenMorphology(raw: String): TokenMorphology {
    val annotation = runCatching {
        if (raw.trimStart().startsWith("[")) JSONArray(raw).optJSONObject(0) else JSONObject(raw)
    }.getOrNull()
    if (annotation == null) return TokenMorphology(raw.takeUnless { it.trimStart().startsWith("[") || it.trimStart().startsWith("{") }.orEmpty(), "Análise não disponível")
    val names = mapOf(
        "noun" to "substantivo", "verb" to "verbo", "adjective" to "adjetivo", "adverb" to "advérbio",
        "pronoun" to "pronome", "personal pronoun" to "pronome pessoal", "relative pronoun" to "pronome relativo",
        "article" to "artigo", "definite article" to "artigo definido", "preposition" to "preposição", "conjunction" to "conjunção",
        "particle" to "partícula", "interjection" to "interjeição", "numeral" to "numeral",
        "present" to "presente", "imperfect" to "imperfeito", "aorist" to "aoristo", "perfect" to "perfeito",
        "pluperfect" to "mais-que-perfeito", "future" to "futuro", "active" to "ativo", "passive" to "passivo",
        "middle" to "médio", "middle/passive" to "médio/passivo", "indicative" to "indicativo", "subjunctive" to "subjuntivo",
        "imperative" to "imperativo", "optative" to "optativo", "infinitive" to "infinitivo", "participle" to "particípio",
        "nominative" to "nominativo", "genitive" to "genitivo", "dative" to "dativo", "accusative" to "acusativo", "vocative" to "vocativo",
        "singular" to "singular", "plural" to "plural", "dual" to "dual", "masculine" to "masculino", "feminine" to "feminino", "neuter" to "neutro",
        "first" to "1ª pessoa", "second" to "2ª pessoa", "third" to "3ª pessoa"
    )
    val features = annotation.optJSONObject("features")
    val description = listOf("partOfSpeech", "tense", "voice", "mood", "case", "number", "gender", "person")
        .mapNotNull { key -> features?.optString(key)?.takeIf(String::isNotBlank)?.let { names[it.lowercase()] ?: it.takeUnless { value -> value.startsWith("{") || value.startsWith("[") } } }
        .joinToString(" · ")
    return TokenMorphology(annotation.optString("rawMorphologyCode"), description.ifBlank { "Análise não disponível" })
}
