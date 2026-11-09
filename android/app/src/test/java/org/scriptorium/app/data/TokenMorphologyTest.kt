package org.scriptorium.app.data

import org.junit.Assert.*
import org.junit.Test

class TokenMorphologyTest {
    @Test fun exportedMorphologyBecomesHumanReadableWithoutLosingSourceCode() {
        val result = tokenMorphology("""[{"rawMorphologyCode":"T-NSM","features":{"partOfSpeech":"definite article","case":"nominative","number":"singular","gender":"masculine"}}]""")
        assertEquals("T-NSM", result.code)
        assertEquals("artigo definido · nominativo · singular · masculino", result.description)
    }
    @Test fun missingOrMalformedAnnotationNeverPrintsJson() {
        assertEquals("Análise não disponível", tokenMorphology("[{broken").description)
        assertEquals("", tokenMorphology("[{broken").code)
        assertEquals("V-PAI", tokenMorphology("V-PAI").code)
    }
}
