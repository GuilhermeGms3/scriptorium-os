package org.scriptorium.app.data

import android.content.Context

/** Device navigation/preferences only; never written to an immutable content package. */
class ReadingPreferences(context: Context) {
    private val preferences = context.getSharedPreferences("reading", Context.MODE_PRIVATE)
    fun lastPassage(): String? = preferences.getString("last-passage", null)
    fun savePassage(passage: Passage) { preferences.edit().putString("last-passage", passage.encoded()).apply() }
    var sound: Boolean
        get() = preferences.getBoolean("ambient-sound", false)
        set(value) { preferences.edit().putBoolean("ambient-sound", value).apply() }
}
