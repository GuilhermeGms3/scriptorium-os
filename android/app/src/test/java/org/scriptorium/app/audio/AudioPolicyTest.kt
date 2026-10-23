package org.scriptorium.app.audio

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class AudioPolicyTest {
    @Test fun samsungIsoThreeLanguageCodesMatchInstalledPortugueseAndSpanish() {
        assertEquals("pt", narrationLanguageCode("por-x-lvariant-f00"))
        assertEquals("es", narrationLanguageCode("spa-default"))
        assertEquals("pt-BR", voiceLanguageTag(java.util.Locale.forLanguageTag("por-x-lvariant-f00"), "pt-BR-SMTf00"))
        assertEquals("es-MX", voiceLanguageTag(java.util.Locale.forLanguageTag("spa-x-lvariant-f00"), "es-MX-SMTf00"))
    }
    @Test fun languageAliasesDoNotEquateDifferentOrAncientLanguages() {
        assertNotEquals(narrationLanguageCode("es"), narrationLanguageCode("pt"))
        assertNotEquals(narrationLanguageCode("grc"), narrationLanguageCode("el"))
        assertEquals("en-US", voiceLanguageTag(java.util.Locale.US, "en-us-x-local"))
    }
    @Test fun segmentsKeepLiteralUnicodeAndParagraphs() {
        val text = ("No princípio. λόγος אֱלֹהִים 🌱\n\nUm tempo para ouvir. ").repeat(60)
        val segments = narrationSegments(text)
        assertEquals(text, segments.joinToString(""))
        assertTrue(segments.all { it.length <= 600 && !it.first().isLowSurrogate() && !it.last().isHighSurrogate() })
    }
    @Test fun segmentsNeverBreakSurrogatePairAtLimit() {
        val text = "a".repeat(599) + "🌱" + "b".repeat(700)
        assertEquals(text, narrationSegments(text).joinToString(""))
        assertTrue(narrationSegments(text).none { it.last().isHighSurrogate() })
    }
    @Test fun blankAndOversizedTextAreRejected() {
        assertThrows(IllegalArgumentException::class.java) { narrationSegments(" ") }
        assertThrows(IllegalArgumentException::class.java) { narrationSegments("a".repeat(30001)) }
    }
    @Test fun sourceEditionAndSchemeParticipateInIdentity() {
        val a = NarrationEntry.create("Passagem", "Texto literal.", "pt-BR", JSONObject().put("edition", "A").put("scheme", "mt"))
        val b = NarrationEntry.create("Passagem", "Texto literal.", "pt-BR", JSONObject().put("edition", "B").put("scheme", "mt"))
        val c = NarrationEntry.create("Passagem", "Texto literal.", "pt-BR", JSONObject().put("edition", "A").put("scheme", "lxx"))
        assertNotEquals(a.id, b.id); assertNotEquals(a.id, c.id)
        assertEquals(a.id, NarrationEntry.parse(a.json()).id)
    }
    @Test fun changedTextDoesNotInheritOldProgressIdentity() {
        val a = NarrationEntry.create("Pessoal", "O tempo passa.", "pt-BR", JSONObject().put("kind", "personal"))
        assertThrows(IllegalArgumentException::class.java) { NarrationEntry.parse(a.json().put("text", "Outra reflexão.")) }
    }
    @Test fun invalidVersionIsRejected() {
        val a = NarrationEntry.create("Pessoal", "Um texto.", "pt-BR", JSONObject().put("kind", "personal"))
        assertThrows(IllegalArgumentException::class.java) { NarrationEntry.parse(a.json().put("version", 2)) }
    }
}
