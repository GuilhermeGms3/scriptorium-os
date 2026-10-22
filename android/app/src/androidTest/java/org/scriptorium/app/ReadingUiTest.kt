package org.scriptorium.app

import android.content.Intent
import android.graphics.Rect
import android.os.Bundle
import android.os.SystemClock
import android.view.MotionEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.scriptorium.app.data.*
import org.json.JSONObject
import org.scriptorium.app.content.ContentPackageStore
import android.util.AtomicFile
import java.io.File

/** Opt-in against the isolated private QA emulator, using the real native accessibility tree. */
class ReadingUiTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val automation = instrumentation.uiAutomation
    private fun descendants(node: AccessibilityNodeInfo?): List<AccessibilityNodeInfo> =
        if (node == null || !node.refresh()) emptyList() else listOf(node) + (0 until node.childCount).flatMap { descendants(node.getChild(it)) }
    private fun nodes() = descendants(automation.rootInActiveWindow)
    private fun label(node: AccessibilityNodeInfo) = listOfNotNull(node.text, node.contentDescription).joinToString(" ")
    private fun waitNode(value: String, exact: Boolean = true): AccessibilityNodeInfo {
        val end = SystemClock.uptimeMillis() + 30_000
        while (SystemClock.uptimeMillis() < end) {
            nodes().firstOrNull { if (exact) it.text?.toString() == value || it.contentDescription?.toString() == value else label(it).contains(value) }?.let { return it }
            SystemClock.sleep(180)
        }
        error("Não encontrou $value. Tela: ${nodes().map(::label).filter(String::isNotBlank).joinToString(" | ").take(2500)}")
    }
    private fun click(value: String, exact: Boolean = true) {
        val node = waitNode(value, exact)
        var target: AccessibilityNodeInfo? = node
        while (target != null) {
            if (target.isClickable && target.performAction(AccessibilityNodeInfo.ACTION_CLICK)) { SystemClock.sleep(500); return }
            target = target.parent
        }
        val bounds = Rect(); node.getBoundsInScreen(bounds)
        val now = SystemClock.uptimeMillis()
        val down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, bounds.centerX().toFloat(), bounds.centerY().toFloat(), 0)
        val up = MotionEvent.obtain(now, now + 60, MotionEvent.ACTION_UP, bounds.centerX().toFloat(), bounds.centerY().toFloat(), 0)
        try { automation.injectInputEvent(down, true); automation.injectInputEvent(up, true) } finally { down.recycle(); up.recycle() }
        SystemClock.sleep(350)
    }
    private fun enter(value: String) {
        val end = SystemClock.uptimeMillis() + 30_000
        while (SystemClock.uptimeMillis() < end) {
            val edit = nodes().firstOrNull { it.isEditable }
            if (edit != null) {
                assertTrue(edit.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value) }))
                return
            }
            SystemClock.sleep(180)
        }
        error("Campo de referência não ficou disponível: ${nodes().map(::label).filter(String::isNotBlank)}")
    }
    private fun capture(name: String) {
        SystemClock.sleep(500)
        val bitmap = automation.takeScreenshot() ?: error("Screenshot indisponível")
        File(instrumentation.targetContext.getExternalFilesDir(null), "feedback-041-$name.png").outputStream().use {
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
        }
        bitmap.recycle()
    }
    private fun back() {
        automation.executeShellCommand("input keyevent KEYCODE_BACK").use { descriptor ->
            android.os.ParcelFileDescriptor.AutoCloseInputStream(descriptor).use { it.readBytes() }
        }
        SystemClock.sleep(400)
    }
    private fun reveal(value: String) {
        for (direction in listOf(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD, AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD)) {
            repeat(12) {
                if (nodes().any { it.text?.toString() == value }) return
                val scroller = nodes().filter { it.isScrollable && it.actionList.any { action -> action.id == direction } }
                    .maxByOrNull { val bounds = Rect(); it.getBoundsInScreen(bounds); bounds.height() }
                scroller?.performAction(direction)
                SystemClock.sleep(550)
            }
        }
        waitNode(value)
    }
    private fun repository(): MobileRepository {
        val context = instrumentation.targetContext
        val pointer = AtomicFile(File(context.filesDir, "active-content"))
        return MobileRepository(ContentPackageStore(File(context.filesDir, "content"), { pointer.openRead().use { it.readBytes().decodeToString() } }, { error("QA somente leitura") }, Sqlite::validate),
            ReadingNavigation(JSONObject(context.assets.open("reading-labels.json").bufferedReader().use { it.readText() })))
    }
    private fun startAt(reference: String) {
        val context = instrumentation.targetContext
        val repository = repository()
        ReadingPreferences(context).savePassage(requireNotNull(repository.resolveReference(reference, repository.scriptureEditions().first())))
        context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        waitNode("Seu scriptorium")
    }
    @Test fun searchNavigatesAfterRestoredReaderAndSameChapterRequests() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("uiQa") == "true")
        val preferences = ReadingPreferences(instrumentation.targetContext)
        val original = preferences.appearance
        try {
            preferences.appearance = ReadingAppearance(dockedComments = true, motion = false)
            startAt("Gn1:1"); click("Leitura"); waitNode("Gênesis 1", false)
            val homeBounds = Rect(); waitNode("Home").getBoundsInScreen(homeBounds)
            assertTrue(kotlin.math.abs(homeBounds.centerX() - instrumentation.targetContext.resources.displayMetrics.widthPixels / 2) < 10)
            click("Busca"); enter("maldição"); click("Pesquisar")
            val firstHit = repository().search("maldição", repository().scriptureEditions().first(), LocalSearchScope.SCRIPTURE).first()
            waitNode(firstHit.title); capture("search")
            val resultList = nodes().filter { it.isScrollable }.maxByOrNull { val rect = Rect(); it.getBoundsInScreen(rect); rect.height() }
            val resultsBounds = Rect(); requireNotNull(resultList).getBoundsInScreen(resultsBounds)
            assertTrue("Resultados precisam de espaço útil", resultsBounds.height() > instrumentation.targetContext.resources.displayMetrics.heightPixels * 0.3)
            for (reference in listOf("Jo 3:16", "Jo 3:18")) {
                click("Busca"); enter(reference); click("Pesquisar")
                val result = requireNotNull(repository().resolveReference(reference, repository().scriptureEditions().first()))
                capture("search-reference")
                click("${result.title} ${result.chapter}:${result.verse}")
                waitNode("${result.title} ${result.chapter}:${result.verse}")
                waitNode(result.verse.toString())
                assertFalse(nodes().any { it.text?.toString() in listOf("Idioma", "Anotar", "Favoritar", "Comentários no capítulo") })
                val actual = decodePassage(preferences.lastPassage(), repository().scriptureEditions())
                assertEquals(result.bookId, actual?.bookId); assertEquals(result.chapter, actual?.chapter)
                assertEquals(result.verse, actual?.verse)
            }
            capture("reader")
            click("Interlinear")
            val requested = requireNotNull(repository().resolveReference("Jo3:18", repository().scriptureEditions().first()))
            val originalEdition = repository().originalEditions(requested).first()
            val originalUnit = repository().verses(requested.copy(edition = originalEdition)).first { it.number("verse_start") == 18 }
            waitNode(originalUnit.text("display_address")); capture("interlinear")
            assertFalse(nodes().any { label(it).contains("rawMorphologyCode") || label(it).contains("partOfSpeech") })
            click("Comparação"); waitNode("${requested.title} 3:18")
            click("Leitura"); waitNode("Voltar pra escolha", false)
            back(); waitNode("Escrituras e textos antigos"); capture("books")
            click("Gênesis"); waitNode("Escolha o capítulo", false); back(); waitNode("Escrituras e textos antigos")
            click("Menu"); waitNode("Aparência e leitura"); waitNode("Pacotes"); capture("menu"); back()
            println("FEEDBACK_UI_QA centredHome/searchExact/sameChapter/backBooks/readerTabs/centredMenu passed")
        } finally { preferences.appearance = original }
    }

    @Test fun holdVerseRevealsActionsOnlyAfterTwoSeconds() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("uiQa") == "true")
        val preferences = ReadingPreferences(instrumentation.targetContext)
        val original = preferences.appearance
        try {
            preferences.appearance = ReadingAppearance(dockedComments = true, motion = false)
            startAt("Gn12:2"); click("Leitura"); waitNode("Gênesis 12:2")
            val passage = requireNotNull(repository().resolveReference("Gn12:2", repository().scriptureEditions().first()))
            val verse = repository().verses(passage).first { it.number("verse_start") == 2 }
            val bounds = Rect(); waitNode(verse.text("surface_text")).getBoundsInScreen(bounds)
            val now = SystemClock.uptimeMillis()
            val down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, bounds.centerX().toFloat(), bounds.centerY().toFloat(), 0)
            automation.injectInputEvent(down, true); down.recycle()
            SystemClock.sleep(1000)
            assertFalse(nodes().any { it.text?.toString() == "Anotar" })
            SystemClock.sleep(1300)
            val up = MotionEvent.obtain(now, SystemClock.uptimeMillis(), MotionEvent.ACTION_UP, bounds.centerX().toFloat(), bounds.centerY().toFloat(), 0)
            automation.injectInputEvent(up, true); up.recycle()
            waitNode("Anotar"); waitNode("Favoritar"); waitNode("Copiar versículo")
            click("Fechar"); waitNode("Gênesis 12:2")
            assertFalse(nodes().any { label(it).contains("Comentários no capítulo") })
            println("HOLD_VERSE_QA actionsHidden/hold2seconds/dockReference2 passed")
        } finally { preferences.appearance = original }
    }

    @Test fun compactReaderCollapsedSourcesFiltersAndLibraryAction() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("uiQa") == "true")
        startAt("Gn1:1")
        assertFalse(nodes().any { it.text?.toString() == "Painel" })
        click("Leitura")
        waitNode("Gênesis 1", false)
        assertFalse(nodes().any { label(it).contains("Ir para") })
        val badge = Rect(); waitNode("1").getBoundsInScreen(badge)
        assertTrue("Selo deve ser compacto", badge.width() / instrumentation.targetContext.resources.displayMetrics.density <= 44)
        val repository = repository()
        val passage = requireNotNull(repository.resolveReference("Gn1:1", repository.scriptureEditions().first()))
        val first = commentGroups(passage, repository.verses(passage), repository.comments(passage), repository.chapterTargets(passage)).first { it.verse == 1 }.comments.first()
        val title = first.text("source_title")
        waitNode(title)
        assertFalse(nodes().any { it.text?.toString() == readingParagraphs(first.text("body")) })
        click("Expandir comentário de $title")
        waitNode("Recolher ▴")
        waitNode(readingParagraphs(first.text("body")))
        click("Recolher comentário de $title")
        assertFalse(nodes().any { it.text?.toString() == readingParagraphs(first.text("body")) })
        click(title)
        waitNode("Biblioteca ↗"); capture("source")
        assertFalse(nodes().any { label(it).contains("Detalhes técnicos") || label(it).contains("Fonte completa, página") })
        click("Biblioteca ↗")
        waitNode("Ver PDF original")
        back(); back()
        waitNode("Gênesis 1", false)
        click("Filtrar", false)
        waitNode("Assunto e fonte")
        click("Fonte: todas ▾")
        waitNode("Todas as fontes")
        click(title)
        waitNode("Limpar filtros")
        click("Limpar filtros")
        click("Filtrar", false)
        click("Painel")
        waitNode("Visão geral")
        click("Fontes")
        waitNode("Comentários na leitura")
        click("Minhas notas")
        waitNode("Anotar esta passagem")
        back()
        click("Home")
        waitNode("Retomar leitura")
        click("Notas"); click("Nova nota"); click("Cor Vinho"); waitNode("Cor da nota · Vinho")
        back(); waitNode("Descartar alterações?"); click("Descartar"); click("Home")
        println("READING_UI_QA compactBadge/noFloat/collapsedSources/filter/libraryHeader/panel/home passed")
    }
    @Test fun appearancePersistsAndCommentsMoveToDockWithoutLoss() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("uiQa") == "true")
        val preferences = ReadingPreferences(instrumentation.targetContext)
        val original = preferences.appearance
        try {
            preferences.appearance = ReadingAppearance()
            startAt("Sl119:105"); click("Leitura"); waitNode("105")
            click("Menu"); click("Aparência e leitura")
            waitNode("Fonte de leitura"); click("Sem serifa"); click("Aumentar letra")
            reveal("Cinza"); click("Cinza")
            reveal("Comentários no painel inferior"); click("Comentários no painel inferior")
            assertEquals(ReadingFont.SANS, preferences.appearance.font)
            assertEquals(23, preferences.appearance.size)
            assertEquals(ReadingTheme.GRAY, preferences.appearance.theme)
            assertTrue(preferences.appearance.dockedComments)
            back(); waitNode("Recolher painel ▾"); waitNode("105")
            waitNode("Versículo 105")
            assertEquals(1, nodes().count { it.text?.toString()?.startsWith("Filtrar") == true })
            val context = instrumentation.targetContext
            context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
            waitNode("Seu scriptorium"); click("Leitura"); waitNode("Recolher painel ▾")
            assertEquals(ReadingTheme.GRAY, ReadingPreferences(context).appearance.theme)
            click("Home")
            println("APPEARANCE_UI_QA font/size/theme/dock/reopen105 passed")
        } finally { preferences.appearance = original }
    }
    @Test fun thematicLessonLinksRealBookAndRecordsReadStage() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("uiQa") == "true")
        startAt("Gn1:1"); click("Estudos")
        reveal("Aulas temáticas · 111 ▾"); click("Aulas temáticas · 111 ▾")
        reveal("Encontrar aula"); enter("Trindade")
        reveal("Abrir aula →"); click("Abrir aula →")
        waitNode("Etapas da aula", false)
        reveal("Ler na Biblioteca ↗"); click("Ler na Biblioteca ↗")
        waitNode("Voltar à", false)
        val titles = repository().lessonReadings("doctrine:trinity", "Trindade").map { it.title }.toSet()
        assertTrue("A Biblioteca deve identificar o livro aberto", nodes().any { it.text?.toString() in titles })
        back(); back()
        waitNode("Etapas da aula", false)
        reveal("Próxima etapa")
        val mark = if (nodes().any { it.text?.toString() == "Etapa lida ✓" }) "Etapa lida ✓" else "Marcar etapa como lida"
        click(mark)
        waitNode("Etapas da aula · 2", false)
        val personal = PersonalRepository(File(instrumentation.targetContext.filesDir, "personal.sqlite3"))
        assertTrue(personal.progress("lesson:doctrine:trinity", 1).any { !it["completed_at"].isNullOrBlank() })
        click("Home")
        println("LESSON_UI_QA horizontal/bookLibrary/back/readStage passed")
    }

    @Test fun horizontalCourseRetainsDraftAcrossStepsAndExit() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("uiQa") == "true")
        val context = instrumentation.targetContext
        context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        waitNode("Seu scriptorium")
        click("Estudos")
        reveal("Gênesis 1: texto, contexto e interpretações")
        click("Gênesis 1: texto, contexto e interpretações")
        waitNode("Módulos · 1 de 6")
        waitNode("Etapas do módulo · 1 de 14")
        repeat(12) {
            reveal("Próxima etapa")
            click("Próxima etapa")
        }
        waitNode("Minha atividade")
        reveal("Sua resposta, com fontes")
        val response = "QA isolado: argumento com observação da passagem e referência para verificar a conservação do rascunho entre as etapas."
        enter(response)
        // ACTION_SET_TEXT does not open the IME. Navigate explicitly to save the draft.
        reveal("Anterior")
        click("Anterior")
        reveal("Próxima etapa")
        click("Próxima etapa")
        reveal("Sua resposta, com fontes")
        assertTrue(nodes().any { it.text?.toString() == response })
        click("Voltar aos percursos")
        waitNode("Percursos acadêmicos")
        val personal = org.scriptorium.app.data.PersonalRepository(java.io.File(context.filesDir, "personal.sqlite3"))
        val progress = personal.progress("genesis-1", 1).single { it["module_id"] == "orientacao" }
        assertEquals(response, org.json.JSONObject(progress["work_json"]!!).getString("response"))
        assertTrue(progress["completed_at"].isNullOrBlank())
        click("Home")
        println("STUDY_UI_QA horizontal14/draft-stage-exit/no-automatic-completion passed")
    }
}
