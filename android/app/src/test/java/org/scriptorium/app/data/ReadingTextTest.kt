package org.scriptorium.app.data

import org.junit.Assert.*
import org.junit.Test

class ReadingTextTest {
    @Test fun displaySectionsKeepTextAndRespectExistingParagraphs() {
        val sentence = "Uma explicação completa conserva as palavras do documento e termina aqui. "
        val raw = sentence.repeat(18).trim() + "\n\nOutro parágrafo já definido."
        val sections = libraryReadingSections(raw)
        assertTrue(sections.size > 2)
        assertEquals(readingParagraphs(raw).replace(Regex("\\s+"), " "), sections.joinToString(" ").replace(Regex("\\s+"), " "))
        assertEquals("Outro parágrafo já definido.", sections.last())
        assertTrue(sections.dropLast(1).all { it.endsWith('.') })
        assertEquals(listOf("Texto sem pontuação que não deve ser cortado ao acaso"), libraryReadingSections("Texto sem pontuação que não deve ser cortado ao acaso"))
        assertTrue(libraryReadingSections("  \n\n").isEmpty())
        assertEquals(listOf("Título:\n1. Primeiro\n2. Segundo"), libraryReadingSections("Título:\n1. Primeiro\n2. Segundo"))
    }

    @Test fun indicatorWindowsStayBoundedAndAlwaysContainTheActiveSection() {
        for (count in listOf(1, 5, 66, 1500)) for (capacity in 1..9) for (selected in 0 until count) {
            val indices = readingIndicatorWindow(count, selected, capacity)
            assertTrue(selected in indices)
            assertTrue(indices.first >= 0 && indices.last < count)
            assertTrue(indices.count() <= capacity)
        }
        assertTrue(readingIndicatorWindow(0, 0, 9).isEmpty())
        assertTrue(readingIndicatorWindow(50, 2, 0).isEmpty())
    }
    @Test fun reflowsHardLineBreaksButPreservesParagraphsAndLists() {
        assertEquals("Eficácia da oração No momento em que o Senhor pediu não darem coisas santas aos cães.\n\nOutra seção.",
            readingParagraphs("Eficácia da oração\nNo momento em que o\nSenhor pediu não\ndarem coisas santas\naos cães.\n\nOutra seção."))
        assertEquals("72\nOração:\nTexto contínuo.\n1. Primeiro\n2. Segundo", readingParagraphs("72\nOração:\nTexto contínuo.\n1. Primeiro\n2. Segundo"))
    }
    @Test fun anchorMovesOffTheSliverOfThePreviousVerse() {
        assertEquals(2, readingAnchor(listOf(VisibleReadingItem(1, -180, 200), VisibleReadingItem(2, 20, 200)), 0, 300))
        assertEquals(1, readingAnchor(listOf(VisibleReadingItem(1, 0, 50), VisibleReadingItem(2, 50, 400)), 0, 300))
        assertEquals(1, readingAnchor(listOf(VisibleReadingItem(1, -200, 900)), 0, 300))
        assertNull(readingAnchor(emptyList(), 0, 300))
    }
}
