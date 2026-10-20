package org.scriptorium.app.data

import org.json.JSONObject

enum class StudyPageKind { INTRODUCTION, GUIDE_MODULE, CHAPTER, SOURCES, NOTEBOOK, OBJECTIVES, LESSON_SECTION, READINGS, ACTIVITY, REVIEW }
data class StudyPage(val id: String, val title: String, val kind: StudyPageKind, val content: JSONObject? = null,
                     val lessonId: String? = null, val lessonTitle: String? = null, val lastInLesson: Boolean = false)

/** Presentation sequence only. Original content, identifiers and completion rules are preserved. */
object StudySequence {
    fun guide(guide: JSONObject, lesson: JSONObject?): List<StudyPage> = buildList {
        add(StudyPage("introduction", "Começar", StudyPageKind.INTRODUCTION))
        guide.objects("modules").forEachIndexed { index, module -> add(StudyPage("module:$index", module.getString("title"), StudyPageKind.GUIDE_MODULE, module)) }
        lesson?.objects("chapters")?.forEach { chapter -> add(StudyPage("chapter:${chapter.getString("id")}", chapter.getString("title"), StudyPageKind.CHAPTER, chapter)) }
        add(StudyPage("sources", "Leituras e fontes", StudyPageKind.SOURCES))
        add(StudyPage("notebook", "Minha síntese", StudyPageKind.NOTEBOOK))
    }
    fun module(module: JSONObject): List<StudyPage> = buildList {
        add(StudyPage("objectives", "Objetivos", StudyPageKind.OBJECTIVES))
        module.objects("lessons").forEach { lesson ->
            val sections = lesson.objects("sections")
            sections.forEachIndexed { index, section -> add(StudyPage("${lesson.getString("id")}:$index", section.getString("title"), StudyPageKind.LESSON_SECTION, section, lesson.getString("id"), lesson.getString("title"), index == sections.lastIndex)) }
        }
        add(StudyPage("readings", "Leituras e conexões", StudyPageKind.READINGS))
        add(StudyPage("activity", "Minha atividade", StudyPageKind.ACTIVITY))
        add(StudyPage("review", "Revisar e concluir", StudyPageKind.REVIEW))
    }
    fun unlocked(modules: List<JSONObject>, index: Int, progress: List<Row>): Boolean = index in modules.indices &&
        modules.take(index).all { module -> progress.any { it.text("module_id") == module.getString("id") && !it["completed_at"].isNullOrBlank() } }
    fun resumeIndex(modules: List<JSONObject>, progress: List<Row>): Int = modules.indexOfFirst { module ->
        progress.none { it.text("module_id") == module.getString("id") && !it["completed_at"].isNullOrBlank() }
    }.takeIf { it >= 0 } ?: modules.lastIndex.coerceAtLeast(0)
}
