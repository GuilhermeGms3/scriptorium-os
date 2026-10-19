package org.scriptorium.app.data

import java.io.File
import java.util.UUID
import org.json.JSONObject
import org.json.JSONArray

/** This file is never part of the distributed content, and patches never attach it. */
class PersonalRepository(private val file: File) {
    init {
        Sqlite.open(file, false).use { db ->
            val version = db.rows("PRAGMA user_version").single().values.single()?.toInt() ?: 0
            require(version <= 2) { "Atualize o aplicativo antes de abrir suas notas." }
            if (version == 0) {
                db.rows("BEGIN IMMEDIATE")
                try {
                    db.rows("CREATE TABLE notes(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,source_id TEXT,updated_at TEXT NOT NULL)")
                    db.rows("PRAGMA user_version=1")
                    db.rows("COMMIT")
                } catch (failure: Exception) { db.rows("ROLLBACK"); throw failure }
            }
            if (version < 2) {
                db.rows("BEGIN IMMEDIATE")
                try {
                    db.rows("ALTER TABLE notes ADD COLUMN color TEXT")
                    db.rows("ALTER TABLE notes ADD COLUMN source_json TEXT")
                    db.rows("ALTER TABLE notes ADD COLUMN version INTEGER NOT NULL DEFAULT 1")
                    db.rows("CREATE TABLE groups(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',color TEXT NOT NULL DEFAULT '#bca16a')")
                    db.rows("CREATE TABLE folders(id TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES groups(id),parent_id TEXT REFERENCES folders(id),name TEXT NOT NULL,UNIQUE(id,group_id))")
                    db.rows("CREATE TABLE note_groups(note_id TEXT NOT NULL REFERENCES notes(id),group_id TEXT NOT NULL REFERENCES groups(id),folder_id TEXT REFERENCES folders(id),PRIMARY KEY(note_id,group_id))")
                    db.rows("CREATE TABLE note_edges(source_id TEXT NOT NULL REFERENCES notes(id),target_id TEXT NOT NULL REFERENCES notes(id),kind TEXT NOT NULL CHECK(kind IN ('reference','manual')),PRIMARY KEY(source_id,target_id,kind),CHECK(source_id!=target_id))")
                    db.rows("CREATE INDEX note_edges_target ON note_edges(target_id)")
                    db.rows("CREATE TABLE course_progress(course_id TEXT NOT NULL,revision INTEGER NOT NULL,module_id TEXT NOT NULL,work_json TEXT NOT NULL,completed_at TEXT,PRIMARY KEY(course_id,revision,module_id))")
                    db.rows("CREATE TABLE personal_imports(id TEXT PRIMARY KEY,imported_at TEXT NOT NULL)")
                    db.rows("CREATE TABLE reading_marks(id TEXT PRIMARY KEY,kind TEXT NOT NULL,target_json TEXT NOT NULL,label TEXT NOT NULL,body TEXT NOT NULL DEFAULT '')")
                    db.rows("CREATE TABLE saved_sources(id TEXT PRIMARY KEY,title TEXT NOT NULL,payload_json TEXT NOT NULL)")
                    db.rows("CREATE TABLE translation_cache(id TEXT PRIMARY KEY,body TEXT NOT NULL,provider TEXT NOT NULL)")
                    db.rows("PRAGMA user_version=2")
                    db.rows("COMMIT")
                } catch (failure: Exception) { db.rows("ROLLBACK"); throw failure }
            }
        }
    }
    fun list(): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM notes ORDER BY updated_at DESC") }
    fun save(id: String?, title: String, body: String, sourceId: String?, color: String? = null): String {
        require(title.trim().length in 1..300 && body.length <= 200_000) { "Confira o título e o tamanho da nota." }
        require(color == null || color.matches(Regex("#[a-fA-F0-9]{6}"))) { "Use uma cor hexadecimal válida." }
        val actual = id ?: UUID.randomUUID().toString()
        Sqlite.open(file, false).use {
            it.rows("BEGIN IMMEDIATE")
            try {
            it.rows("INSERT INTO notes(id,title,body,source_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,source_id=excluded.source_id,updated_at=excluded.updated_at,version=notes.version+1",
                listOf(actual, title.trim(), body, sourceId, java.time.Instant.now().toString()))
            if (color != null) it.rows("UPDATE notes SET color=? WHERE id=?", listOf(color, actual))
            val targets = it.rows("SELECT id,title FROM notes")
            it.rows("DELETE FROM note_edges WHERE source_id=? AND kind='reference'", listOf(actual))
            val codeFree = body.replace(Regex("```[\\s\\S]*?```|`[^`\\n]*`"), "")
            Regex("\\[\\[([^]\\n]{1,1000})]]").findAll(codeFree).forEach { match ->
                val key = match.groupValues[1].substringBefore('|').trim()
                val byId = targets.find { row -> row.text("id") == key }
                val byTitle = targets.filter { row -> row.text("title").equals(key, ignoreCase = true) }
                val target = byId ?: byTitle.singleOrNull()
                if (target != null && target.text("id") != actual) it.rows("INSERT OR IGNORE INTO note_edges VALUES(?,?,'reference')", listOf(actual, target.text("id")))
            }
            it.rows("COMMIT")
            } catch (failure: Exception) { it.rows("ROLLBACK"); throw failure }
        }
        return actual
    }

    fun importDesktopSeed(raw: String) {
        val seed = JSONObject(raw)
        Sqlite.open(file, false).use { db ->
            if (db.rows("SELECT id FROM personal_imports WHERE id='desktop-personal-v1'").isNotEmpty()) return
            fun entries(key: String): List<JSONObject> = seed.optJSONArray(key)?.let { array -> (0 until array.length()).map(array::getJSONObject) }.orEmpty()
            fun JSONObject.nullable(key: String): String? = if (isNull(key) || !has(key)) null else getString(key)
            db.rows("BEGIN IMMEDIATE")
            try {
                entries("studies").forEach { row -> db.rows("INSERT OR IGNORE INTO groups(id,title,description,color) VALUES(?,?,?,?)", listOf(row.getString("id"), row.getString("title"), row.nullable("description") ?: "", row.nullable("color") ?: "#bca16a")) }
                entries("notes").forEach { row ->
                    db.rows("INSERT OR IGNORE INTO notes(id,title,body,source_id,updated_at,color,source_json) VALUES(?,?,?,?,?,?,?)", listOf(row.getString("id"), row.nullable("title") ?: "Nota sem título", row.getString("content"), null, row.getString("updated_at"), row.nullable("color"), row.nullable("source_json")))
                }
                val remaining = entries("note_folders").toMutableList()
                while (remaining.isNotEmpty()) {
                    val ready = remaining.filter { row -> row.nullable("parent_id") == null || db.rows("SELECT id FROM folders WHERE id=?", listOf(row.nullable("parent_id"))).isNotEmpty() }
                    require(ready.isNotEmpty()) { "Pastas do backup contêm ciclo ou pai ausente." }
                    ready.forEach { row -> db.rows("INSERT OR IGNORE INTO folders VALUES(?,?,?,?)", listOf(row.getString("id"), row.getString("study_id"), row.nullable("parent_id"), row.getString("name"))) }
                    remaining.removeAll(ready.toSet())
                }
                entries("note_links").filter { it.optString("target_kind") == "study" }.forEach { row ->
                    db.rows("INSERT OR IGNORE INTO note_groups(note_id,group_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM notes WHERE id=?) AND EXISTS(SELECT 1 FROM groups WHERE id=?)", listOf(row.getString("note_id"), row.nullable("target_id"), row.getString("note_id"), row.nullable("target_id")))
                }
                entries("note_placements").forEach { row -> db.rows("INSERT INTO note_groups VALUES(?,?,?) ON CONFLICT(note_id,group_id) DO UPDATE SET folder_id=excluded.folder_id", listOf(row.getString("note_id"), row.getString("study_id"), row.getString("folder_id"))) }
                for ((key, kind) in listOf("note_references" to "reference", "note_connections" to "manual")) entries(key).forEach { row ->
                    db.rows("INSERT OR IGNORE INTO note_edges VALUES(?,?,?)", listOf(row.getString("source_note_id"), row.getString("target_note_id"), kind))
                }
                entries("study_course_progress").forEach { row -> db.rows("INSERT OR IGNORE INTO course_progress VALUES(?,?,?,?,?)", listOf(row.getString("course_id"), row.getInt("course_revision").toString(), row.getString("module_id"), row.getString("work_json"), row.nullable("completed_at"))) }
                for (key in listOf("bookmarks", "highlights", "annotations")) entries(key).forEach { row ->
                    db.rows("INSERT OR IGNORE INTO reading_marks VALUES(?,?,?,?,?)", listOf(row.getString("id"), key, row.nullable("target_json") ?: JSONObject().put("id", row.optString("target_id")).toString(), row.nullable("label") ?: key, row.nullable("body") ?: ""))
                }
                db.rows("INSERT INTO personal_imports VALUES('desktop-personal-v1',?)", listOf(java.time.Instant.now().toString()))
                db.rows("COMMIT")
            } catch (failure: Exception) { db.rows("ROLLBACK"); throw failure }
        }
    }

    fun groups(): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM groups ORDER BY title") }
    fun folders(group: String): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM folders WHERE group_id=? ORDER BY name", listOf(group)) }
    fun notes(group: String?, folder: String?): List<Row> = Sqlite.open(file).use {
        if (group == null) it.rows("SELECT * FROM notes ORDER BY updated_at DESC")
        else it.rows("SELECT n.* FROM notes n JOIN note_groups g ON g.note_id=n.id WHERE g.group_id=? AND (g.folder_id=? OR (? IS NULL AND g.folder_id IS NULL)) ORDER BY n.updated_at DESC", listOf(group, folder, folder))
    }
    fun createGroup(title: String, color: String): String {
        require(title.trim().length in 1..120 && color.matches(Regex("#[a-fA-F0-9]{6}")))
        val id = UUID.randomUUID().toString()
        Sqlite.open(file, false).use { it.rows("INSERT INTO groups(id,title,color) VALUES(?,?,?)", listOf(id, title.trim(), color)) }
        return id
    }
    fun createFolder(group: String, parent: String?, title: String) {
        require(title.trim().length in 1..120)
        Sqlite.open(file, false).use { db ->
            require(parent == null || db.rows("SELECT 1 FROM folders WHERE id=? AND group_id=?", listOf(parent, group)).isNotEmpty())
            db.rows("INSERT INTO folders VALUES(?,?,?,?)", listOf(UUID.randomUUID().toString(), group, parent, title.trim()))
        }
    }
    fun placeNote(note: String, group: String, folder: String?, color: String?) {
        require(color == null || color.matches(Regex("#[a-fA-F0-9]{6}")))
        Sqlite.open(file, false).use { db ->
            require(folder == null || db.rows("SELECT 1 FROM folders WHERE id=? AND group_id=?", listOf(folder, group)).isNotEmpty())
            db.rows("BEGIN IMMEDIATE")
            try {
                db.rows("INSERT INTO note_groups VALUES(?,?,?) ON CONFLICT(note_id,group_id) DO UPDATE SET folder_id=excluded.folder_id", listOf(note, group, folder))
                db.rows("UPDATE notes SET color=? WHERE id=?", listOf(color, note))
                db.rows("COMMIT")
            } catch (failure: Exception) { db.rows("ROLLBACK"); throw failure }
        }
    }
    fun connect(source: String, target: String) {
        require(source != target)
        Sqlite.open(file, false).use { it.rows("INSERT OR IGNORE INTO note_edges VALUES(?,?,'manual')", listOf(minOf(source, target), maxOf(source, target))) }
    }
    fun edges(): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM note_edges") }
    fun backlinks(note: String): List<Row> = Sqlite.open(file).use { it.rows("SELECT n.* FROM notes n JOIN note_edges e ON e.source_id=n.id WHERE e.target_id=?", listOf(note)) }
    fun progress(course: String, revision: Int): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM course_progress WHERE course_id=? AND revision=?", listOf(course, revision.toString())) }
    fun saveProgress(course: String, revision: Int, module: String, work: String, completed: Boolean) {
        require(work.length <= 100_000)
        Sqlite.open(file, false).use { it.rows("INSERT INTO course_progress VALUES(?,?,?,?,?) ON CONFLICT(course_id,revision,module_id) DO UPDATE SET work_json=excluded.work_json,completed_at=excluded.completed_at", listOf(course, revision.toString(), module, work, if (completed) java.time.Instant.now().toString() else null)) }
    }
    fun saveReference(id: String, title: String, json: String) { Sqlite.open(file, false).use { it.rows("INSERT OR IGNORE INTO saved_sources VALUES(?,?,?)", listOf(id, title, json)) } }
    fun references(): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM saved_sources ORDER BY title") }
    fun cachedTranslation(id: String): String? = Sqlite.open(file).use { it.rows("SELECT body FROM translation_cache WHERE id=?", listOf(id)).firstOrNull()?.get("body") }
    fun cacheTranslation(id: String, body: String, provider: String) { Sqlite.open(file, false).use { it.rows("INSERT OR REPLACE INTO translation_cache VALUES(?,?,?)", listOf(id, body, provider)) } }

    fun bookmark(target: JSONObject, label: String, kind: String = "bookmark", body: String = "") {
        require(label.length <= 500 && body.length <= 200_000)
        Sqlite.open(file, false).use { it.rows("INSERT INTO reading_marks VALUES(?,?,?,?,?)", listOf(UUID.randomUUID().toString(), kind, target.toString(), label, body)) }
    }
    fun bookmarks(): List<Row> = Sqlite.open(file).use { it.rows("SELECT * FROM reading_marks ORDER BY rowid DESC") }
    fun backup(): String = Sqlite.open(file).use { db ->
        val result = JSONObject().put("format", "scriptorium-android-personal-v2")
        db.rows("BEGIN")
        try {
            BACKUP_TABLES.forEach { table ->
                val array = JSONArray()
                db.rows("SELECT * FROM $table").forEach { row -> array.put(JSONObject(row)) }
                result.put(table, array)
            }
            db.rows("COMMIT")
        } catch (failure: Exception) { db.rows("ROLLBACK"); throw failure }
        result.toString()
    }
    fun restore(raw: String) {
        require(raw.length <= 20_000_000) { "Backup excede 20 milhões de caracteres." }
        val backup = JSONObject(raw)
        require(backup.getString("format") == "scriptorium-android-personal-v2") { "Formato de backup incompatível." }
        Sqlite.open(file, false).use { db ->
            db.rows("BEGIN IMMEDIATE")
            db.rows("PRAGMA defer_foreign_keys=ON")
            try {
                for (table in BACKUP_TABLES) {
                    val columns = db.rows("PRAGMA table_info($table)").map { it.text("name") }
                    val input = backup.optJSONArray(table) ?: continue
                    require(input.length() <= 100_000) { "Backup contém registros excessivos." }
                    for (index in 0 until input.length()) {
                        val item = input.getJSONObject(index)
                        val present = columns.filter(item::has)
                        require(present.isNotEmpty())
                        val values = present.map { column -> if (item.isNull(column)) null else item.getString(column) }
                        db.rows("INSERT OR IGNORE INTO $table(${present.joinToString(",")}) VALUES(${present.joinToString(",") { "?" }})", values)
                    }
                }
                require(db.rows("PRAGMA foreign_key_check").isEmpty()) { "Backup contém ligações inválidas." }
                db.rows("COMMIT")
            } catch (failure: Exception) { db.rows("ROLLBACK"); throw failure }
        }
    }
    companion object {
        private val BACKUP_TABLES = listOf("groups", "notes", "folders", "note_groups", "note_edges", "course_progress", "reading_marks", "saved_sources", "translation_cache", "personal_imports")
    }
}
