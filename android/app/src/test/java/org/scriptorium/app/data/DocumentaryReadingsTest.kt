package org.scriptorium.app.data

import org.junit.Assert.*
import org.junit.Test

class DocumentaryReadingsTest {
    @Test fun normalizesGreekWithoutInventingLemmaEquivalence() {
        assertEquals("λογος", normalizeDocumentaryHeadword(" ΛΌΓΟΣ "))
        assertEquals(normalizeDocumentaryHeadword("λόγος"), normalizeDocumentaryHeadword("λόγος"))
        assertNotEquals(normalizeDocumentaryHeadword("λόγος"), normalizeDocumentaryHeadword("λόγου"))
        assertEquals("", normalizeDocumentaryHeadword(" "))
    }
    @Test fun distinguishesObjectionsAndResponses() {
        assertTrue(documentaryRole("objection").contains("não é a conclusão"))
        assertEquals("Resposta do autor", documentaryRole("response"))
        assertEquals("Resposta à objeção", documentaryRole("reply"))
    }
}
