package org.scriptorium.app.data

import android.content.Context

/** Device navigation/preferences only; never written to an immutable content package. */
class ReadingPreferences(context: Context) {
    private val preferences = context.getSharedPreferences("reading", Context.MODE_PRIVATE)
    fun lastPassage(): String? = preferences.getString("last-passage", null)
    fun savePassage(passage: Passage) { preferences.edit().putString("last-passage", passage.encoded()).apply() }
    fun bookPage(documentId: String): Int = preferences.getInt("book-page:$documentId", 0).coerceAtLeast(0)
    fun saveBookPage(documentId: String, page: Int) { preferences.edit().putInt("book-page:$documentId", page.coerceAtLeast(0)).apply() }
    /** Until the reader opens a verse's actions once, the chapter shows how to reach them. */
    var verseActionsHint: Boolean
        get() = preferences.getBoolean("verse-actions-hint", true)
        set(value) { preferences.edit().putBoolean("verse-actions-hint", value).apply() }
    var sound: Boolean
        get() = preferences.getBoolean("ambient-sound", false)
        set(value) { preferences.edit().putBoolean("ambient-sound", value).apply() }
    var appearance: ReadingAppearance
        get() = ReadingAppearance(
            font = ReadingFont.entries.firstOrNull { it.name == preferences.getString("appearance-font", null) } ?: ReadingFont.SERIF,
            size = preferences.getInt("appearance-size", 22),
            theme = ReadingTheme.entries.firstOrNull { it.name == preferences.getString("appearance-theme", null) } ?: ReadingTheme.DARK,
            dockedComments = preferences.getBoolean("appearance-dock", false),
            motion = preferences.getBoolean("appearance-motion", true),
        ).normalized()
        set(value) { val safe = value.normalized(); preferences.edit().putString("appearance-font", safe.font.name).putInt("appearance-size", safe.size)
            .putString("appearance-theme", safe.theme.name).putBoolean("appearance-dock", safe.dockedComments).putBoolean("appearance-motion", safe.motion).apply() }
    fun observeAppearance(change: () -> Unit): () -> Unit {
        val listener = android.content.SharedPreferences.OnSharedPreferenceChangeListener { _, key -> if (key?.startsWith("appearance-") == true) change() }
        preferences.registerOnSharedPreferenceChangeListener(listener)
        return { preferences.unregisterOnSharedPreferenceChangeListener(listener) }
    }
}
