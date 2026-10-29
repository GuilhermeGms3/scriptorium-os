package org.scriptorium.app

import android.content.Intent
import android.os.SystemClock
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test

/** Native accessibility QA, opt-in on the isolated emulator, without editing book data. */
class AudioUiTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val automation = instrumentation.uiAutomation
    private fun tree(node: AccessibilityNodeInfo?): List<AccessibilityNodeInfo> = if (node == null) emptyList() else listOf(node) + (0 until node.childCount).flatMap { tree(node.getChild(it)) }
    private fun waitText(text: String): AccessibilityNodeInfo {
        val deadline = SystemClock.uptimeMillis() + 20000
        while (SystemClock.uptimeMillis() < deadline) {
            tree(automation.rootInActiveWindow).firstOrNull { it.text?.toString() == text || it.contentDescription?.toString() == text }?.let { return it }
            SystemClock.sleep(200)
        }
        error("Controle não encontrado: $text")
    }
    private fun click(text: String) {
        var node: AccessibilityNodeInfo? = waitText(text)
        while (node != null) { if (node.isClickable && node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) { SystemClock.sleep(400); return }; node = node.parent }
        error("Controle não acessível por clique: $text")
    }
    @Test fun nativeAudioSectionsAndNavigationAreAccessible() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("audioUiQa") == "true")
        val context = instrumentation.targetContext
        context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        waitText("Seu scriptorium")
        click("Menu"); click("Áudio"); waitText("Scriptorium Áudio")
        assertFalse(tree(automation.rootInActiveWindow).any { it.text?.toString() == "Leitor" })
        click("Reflexões"); waitText("Scriptorium Reflexões"); waitText("Título do episódio")
        val editorialScreenshot = requireNotNull(automation.takeScreenshot())
        try { java.io.File(context.getExternalFilesDir(null), "audio-061-reflections.png").outputStream().use { editorialScreenshot.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) } }
        finally { editorialScreenshot.recycle() }
        click("Voz"); waitText("Filtrar idioma da voz (pt, en, es…)")
        click("Ambiente"); waitText("Adicionar minha música"); waitText("Somente voz")
        val screenshot = requireNotNull(automation.takeScreenshot())
        try { java.io.File(context.getExternalFilesDir(null), "audio-060-ui.png").outputStream().use { screenshot.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) } }
        finally { screenshot.recycle() }
        click("Menu"); click("Áudio"); waitText("Scriptorium Áudio")
        assertTrue(tree(automation.rootInActiveWindow).any { it.isScrollable })
        println("AUDIO_UI_QA native navigation, reader, voices and music controls passed")
    }
}
