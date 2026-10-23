package org.scriptorium.app.data

import org.junit.Assert.*
import org.junit.Test

class ReadingTextTest {
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
