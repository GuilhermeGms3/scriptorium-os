package org.scriptorium.app

import org.junit.Assert.*
import org.junit.Test
import org.scriptorium.app.ui.*
import org.scriptorium.app.data.Row

class LibraryFiltersTest {
    private fun book(title: String, language: String = "", subjects: String = ""): Row =
        mapOf("id" to title, "title" to title, "language" to language, "library_subjects" to subjects)
    private val books = listOf(book("Suma Teológica", "pt-BR", "Teologia|Cristologia"),
        book("Exegese do NT", "pt", "Exegese"), book("Anchor Bible Dictionary", "en", "Geografia"), book("Desconhecido"))

    @Test fun combinesFacetsAndAccentInsensitiveQuery() {
        assertEquals("Suma Teológica", filterLibrary(books, "TEOLOGICA", LibraryFilters("Teologia e doutrina", "Cristologia", "Português")).single().first["title"])
        assertTrue(filterLibrary(books, "Suma", LibraryFilters(subject = "Exegese")).isEmpty())
        assertTrue(filterLibrary(books, "", LibraryFilters(language = "Espanhol")).isEmpty())
    }
    @Test fun unknownMetadataDoesNotHideBooksWithoutFilters() {
        assertEquals(4, filterLibrary(books, "", LibraryFilters()).size)
        assertEquals("Desconhecido", filterLibrary(books, "", LibraryFilters(language = "Não identificado")).single().second)
        assertTrue(librarySubjects(books.last()).isEmpty())
        assertEquals("Outros", libraryBookType(books.last()))
    }
    @Test fun distinguishesHermeneuticsAndAncientConfessionsFromConfessionalStatements() {
        assertEquals("Fontes antigas e patrística", libraryBookType(book("Confissões de Santo Agostinho")))
        assertEquals("Teologia e doutrina", libraryBookType(book("Confissão de Augsburgo")))
        assertEquals("Exegese e hermenêutica", libraryBookType(book("A Doutrina Cristã")))
        assertEquals("Dicionários e léxicos", libraryBookType(book("Anchor Bible Dictionary")))
        assertEquals("Bíblias", libraryBookType(book("Bíblia de estudo Genebra")))
        assertEquals("Comentários e homilias", libraryBookType(book("João comentado Agostinho")))
    }
    @Test fun preservesSourceRecordsAndReversesTheSameAlphabeticalResults() {
        val ascending = filterLibrary(books, "", LibraryFilters())
        assertEquals(ascending.reversed(), filterLibrary(books, "", LibraryFilters(descending = true)))
        assertEquals(books.toSet(), ascending.map { it.first }.toSet())
        assertEquals(2, LibraryFilters(type = "Bíblias", language = "Português").count)
    }
    @Test fun treatsSubjectsAsExactSeparateLabelsAndGroupsLanguageVariants() {
        assertEquals(listOf("Teologia", "Cristologia"), librarySubjects(books.first()))
        assertTrue(filterLibrary(books, "", LibraryFilters(subject = "Cristo")).isEmpty())
        assertEquals(2, filterLibrary(books, "", LibraryFilters(language = "Português")).size)
    }
}
