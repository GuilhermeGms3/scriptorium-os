package org.scriptorium.app.data

import java.io.File
import java.util.UUID

/** This file is never part of the distributed content, and patches never attach it. */
class PersonalRepository(private val file: File) {
    init {
        Sqlite.open(file, false).use { db ->
            val version = db.rows("PRAGMA user_version").single().values.single()?.toInt() ?: 0
            require(version <= 1) { "Atualize o aplicativo antes de abrir suas notas." }
            if (version == 0) {
                db.rows("BEGIN IMMEDIATE")
                try {
                    db.rows("CREATE TABLE notes(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,source_id TEXT,updated_at TEXT NOT NULL)")
                    db.rows("PRAGMA user_version=1")
                    db.rows("COMMIT")
                } catch (failure: Exception) { db.rows("ROLLBACK"); throw failure }
            }
        }
    }
    fun list(): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM notes ORDER BY updated_at DESC") }
    fun save(id: String?, title: String, body: String, sourceId: String?): String {
        require(title.trim().length in 1..300 && body.length <= 200_000) { "Confira o título e o tamanho da nota." }
        val actual = id ?: UUID.randomUUID().toString()
        Sqlite.open(file, false).use {
            it.rows("INSERT INTO notes VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,source_id=excluded.source_id,updated_at=excluded.updated_at",
                listOf(actual, title.trim(), body, sourceId, java.time.Instant.now().toString()))
        }
        return actual
    }
}
