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
    private fun back() {
        automation.executeShellCommand("input keyevent KEYCODE_BACK").use { descriptor ->
            android.os.ParcelFileDescriptor.AutoCloseInputStream(descriptor).use { it.readBytes() }
        }
        SystemClock.sleep(400)
    }
    @Test fun directJumpIndependentCommentDisclosureBackHomeAndColorPalette() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("uiQa") == "true")
        val context = instrumentation.targetContext
        context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        waitNode("Seu scriptorium")
        click("Leitura")
        click("Ir para…")
        enter("Sl 119:105")
        click("Abrir referência")
        waitNode("Salmos 119", false)
        waitNode("105")
        assertTrue("Deve abrir no versículo, sem rolar os 104 anteriores", nodes().any { label(it).contains("lâmpada", true) })
        click("Ir para…")
        enter("Gn1:1")
        click("Abrir referência")
        waitNode("Gênesis 1", false)
        click("Expandir ▾")
        waitNode("Recolher ▴")
        click("Recolher ▴")
        click("Fonte completa, página e contexto ↗")
        waitNode("Fechar")
        back()
        waitNode("Gênesis 1", false)
        back()
        waitNode("Salmos 119", false)
        click("Home")
        waitNode("Retomar leitura")
        click("Notas")
        click("Nova nota")
        click("Cor Vinho")
        waitNode("Cor da nota · Vinho")
        back()
        waitNode("Descartar alterações?")
        click("Descartar")
        waitNode("Nova nota")
        click("Home")
        waitNode("Seu scriptorium")
        println("READING_UI_QA direct105/comment-expand-collapse/source/back/home/palette passed")
    }
}
