package org.scriptorium.app

import org.junit.Assert.assertEquals
import org.junit.Test
import org.scriptorium.app.ui.libraryBookTitle

class LibraryBookTitleTest {
    @Test fun normalizesCaseWithoutChangingTheBibliographicRecord() {
        assertEquals("Bíblia de estudo Genebra", libraryBookTitle("BÍBLIA DE ESTUDO GENEBRA"))
        assertEquals("Manual bíblico MacArthur", libraryBookTitle("MANUAL BÍBLICO MACARTHUR"))
        assertEquals("Suma teológica", libraryBookTitle("Suma Teológica"))
        assertEquals("Carta de Policarpo aos Filipenses", libraryBookTitle("CARTA DE POLICARPO AOS FILIPENSES"))
    }
    @Test fun keepsVolumesAndRecognizableTranslationNames() {
        assertEquals("NDITAT · vol. 2", libraryBookTitle("NOVO DICIONARIO INTERNACIONAL DE TEOLOGIA EXEGESE DO ANTIGO TESTAMENTO VOL. 2"))
        assertEquals("Nag Hammadi · vol. II", libraryBookTitle("Textos gnósticos. Biblioteca de Nag Hammadi II AA.VV"))
        assertEquals("Bíblia NVI · NT", libraryBookTitle("NT-NVI"))
        assertEquals("Bíblia NVI · AT", libraryBookTitle("AT-NVI-Pt"))
    }
    @Test fun removesTransportDetailsAndHandlesEmptyTitles() {
        assertEquals("Anchor Bible Dictionary", libraryBookTitle("Anchor Bible Dictionary — seis volumes (EPUB; derivado textual)"))
        assertEquals("A doutrina cristã", libraryBookTitle("(C:\\Desktop\\A Doutrina Crist\\343 - Santo Agostinho.tif)"))
        assertEquals("Padres apostólicos", libraryBookTitle("PADRES_APOSTÓLICOS.pdf"))
        assertEquals("Sem título", libraryBookTitle("  "))
    }
    @Test fun doesNotInventAnAuthorOrIncompleteEditionForFutureBooks() {
        assertEquals("Teologia sistemática", libraryBookTitle("TEOLOGIA SISTEMÁTICA"))
        assertEquals("Teologia do novo testamento", libraryBookTitle("Teologia do Novo Testamento"))
        assertEquals("Teologia sistemática · trecho", libraryBookTitle("TeologiaSistematica 2ed trecho"))
    }
}
