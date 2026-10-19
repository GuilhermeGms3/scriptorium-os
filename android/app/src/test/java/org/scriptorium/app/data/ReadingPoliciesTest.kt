package org.scriptorium.app.data

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ReadingPoliciesTest {
    @Test fun completionRequiresReadingsLessonsResponseAndCriteria() {
        val module = JSONObject("""{"lessons":[{"id":"a","title":"Aula"}],"passages":[{"id":"p","label":"Gn 1"}],"activity":{"criteria":["Fonte","Argumento"]}}""")
        assertEquals(5, CoursePolicy.issues(module, JSONObject()).size)
        val work = JSONObject().put("lessons", org.json.JSONArray(listOf("a"))).put("readings", org.json.JSONArray(listOf("p"))).put("response", "Resposta com argumento e referência. ".repeat(4)).put("criteria", org.json.JSONArray(listOf(0, 1)))
        assertTrue(CoursePolicy.issues(module, work).isEmpty())
        work.put("criteria", org.json.JSONArray(listOf(0)))
        assertEquals(listOf("Confira: Argumento"), CoursePolicy.issues(module, work))
    }
    @Test fun casedWordPiecePreservesMarksAndPunctuation() {
        val tokenizer = WordPieceTokenizer(listOf("[UNK]", "[CLS]", "[SEP]", "No", "princípio", ".", "λόγος", "בְּרֵאשִׁית", "in", "##im", "##igos"))
        assertArrayEquals(longArrayOf(1, 3, 4, 5, 6, 7, 8, 9, 10, 2), tokenizer.encode("No princípio. λόγος בְּרֵאשִׁית inimigos"))
        assertArrayEquals(longArrayOf(1, 0, 2), tokenizer.encode("no"))
        assertArrayEquals(longArrayOf(1, 3, 4, 2), tokenizer.encode("No princípio. λόγος", 4))
    }
    @Test fun externalLinksRejectLocalAndUnsafeSchemes() {
        for (url in listOf("http://google.com", "javascript:alert(1)", "https://localhost/x", "https://127.0.0.1/x", "https://[::1]/", "https://a.internal/", "https://user:pass@google.com")) assertNull(url, safeExternalUrl(url))
        assertEquals("https://scholar.google.com/", safeExternalUrl("https://scholar.google.com/"))
        assertTrue(ExternalResearch.links("Torá & contexto").all { safeExternalUrl(it.second) != null })
    }
    @Test fun ftsInputCannotBecomeAnOperator() {
        assertEquals("\"OR\" AND \"DROP\" AND \"TABLE\"", ftsQuery("\" OR *; DROP TABLE --"))
        assertEquals("", ftsQuery("*\"()"))
    }
    @Test fun translationKeepsOriginalTermsAndChunkContent() {
        val glossary = JSONObject("""{"version":"1","rules":[{"source":"Logos","target":"Logos"},{"source":"LORD","target":"SENHOR"}]}""")
        assertEquals("o Logos de SENHOR", TranslationPolicy.translate("o Logos de LORD", glossary) { it })
        assertEquals("o Logos de SENHOR", TranslationPolicy.translate("o Logos de LORD", glossary) { it.trim() })
        val original = "Texto com palavras e parágrafos.\n".repeat(300)
        val chunks = TranslationPolicy.chunks(original)
        assertEquals(original, chunks.joinToString(""))
        assertTrue(chunks.all { it.length <= 2500 })
    }
}
