package org.scriptorium.app.data

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.scriptorium.app.content.Edition

class StudySequenceTest {
    @Test fun everySectionAndParagraphIsPreservedInItsOriginalOrder() {
        val module = JSONObject("""{"id":"m","lessons":[{"id":"a","title":"Aula A","sections":[{"title":"Introdução","paragraphs":["primeiro","segundo"]},{"title":"Discussão","paragraphs":["terceiro"]}]},{"id":"b","title":"Aula B","sections":[{"title":"Introdução","paragraphs":["quarto"]}]}]}""")
        val pages = StudySequence.module(module)
        val sections = pages.filter { it.kind == StudyPageKind.LESSON_SECTION }
        assertEquals(listOf("primeiro", "segundo", "terceiro", "quarto"), sections.flatMap { it.content!!.strings("paragraphs") })
        assertEquals(listOf(false, true, true), sections.map { it.lastInLesson })
        assertEquals(pages.size, pages.map { it.id }.distinct().size)
        assertEquals(listOf(StudyPageKind.OBJECTIVES, StudyPageKind.LESSON_SECTION, StudyPageKind.LESSON_SECTION, StudyPageKind.LESSON_SECTION, StudyPageKind.READINGS, StudyPageKind.ACTIVITY, StudyPageKind.REVIEW), pages.map { it.kind })
        assertFalse("Navigation never adds completion evidence", module.has("completed_at"))
    }

    @Test fun guidesKeepBothEditorialModulesAndSupplementaryChapters() {
        val guide = JSONObject("""{"modules":[{"title":"Método","explanation":"Conteúdo"},{"title":"Fontes"}]}""")
        val lesson = JSONObject("""{"chapters":[{"id":"c","title":"Contexto","paragraphs":["Texto integral"]}]}""")
        val pages = StudySequence.guide(guide, lesson)
        assertEquals(listOf("Começar", "Método", "Fontes", "Contexto", "Leituras e fontes", "Minha síntese"), pages.map { it.title })
        assertEquals("Texto integral", pages[3].content!!.strings("paragraphs").single())
        assertEquals(5, StudySequence.guide(guide, null).size)
    }

    @Test fun unlockingRequiresEveryPreviousModuleAndResumesFirstIncomplete() {
        val modules = listOf("a", "b", "c").map { JSONObject().put("id", it) }
        val progress = listOf(mapOf("module_id" to "a", "completed_at" to "2026-10-20"), mapOf("module_id" to "b", "completed_at" to ""))
        assertTrue(StudySequence.unlocked(modules, 0, emptyList()))
        assertTrue(StudySequence.unlocked(modules, 1, progress))
        assertFalse(StudySequence.unlocked(modules, 2, progress))
        assertFalse(StudySequence.unlocked(modules, -1, progress))
        assertEquals(1, StudySequence.resumeIndex(modules, progress))
        assertFalse(StudySequence.unlocked(modules, 2, listOf(mapOf("module_id" to "b", "completed_at" to "done"))))
        assertEquals(2, StudySequence.resumeIndex(modules, modules.map { mapOf("module_id" to it.getString("id"), "completed_at" to "done") }))
    }

    @Test fun contextualCommentsRequireExactIdentityAndExplicitContextRequest() {
        val passage = Passage(Edition("e", "Edição", "e.sqlite3"), "work", "genesis", "Gênesis", 1, "scheme", 4, 6)
        val address = mapOf("work_id" to "work", "book_id" to "genesis", "scheme_id" to "scheme", "chapter" to "1", "verse_start" to "6", "verse_end" to "8")
        assertTrue(commentApplies(passage, listOf(address)))
        assertFalse(commentApplies(passage, listOf(address + ("verse_start" to "7"))))
        for (field in listOf("work_id", "book_id", "scheme_id", "chapter")) assertFalse(field, commentApplies(passage, listOf(address + (field to "other")), true))
        val context = address + mapOf("chapter" to null, "verse_start" to null, "verse_end" to null)
        assertFalse(commentApplies(passage, listOf(context)))
        assertTrue(commentApplies(passage, listOf(context), true))
        assertFalse(commentApplies(passage, emptyList(), true))
    }
}
