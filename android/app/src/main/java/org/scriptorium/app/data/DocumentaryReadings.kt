package org.scriptorium.app.data

import java.text.Normalizer
import java.util.Locale

fun normalizeDocumentaryHeadword(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
    .replace(Regex("\\p{M}"), "").replace(Regex("\\s"), "").lowercase(Locale.ROOT)

fun documentaryRole(role: String): String = when (role) {
    "question" -> "Questão"
    "objection" -> "Objeção — não é a conclusão do autor"
    "counterpoint" -> "Em contrário"
    "response" -> "Resposta do autor"
    "reply" -> "Resposta à objeção"
    "entry" -> "Verbete"
    else -> "Seção"
}
