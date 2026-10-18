package org.scriptorium.app.data

import androidx.sqlite.SQLiteConnection
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import java.io.File

typealias Row = Map<String, String?>
fun Row.text(key: String): String = get(key).orEmpty()
fun Row.number(key: String): Int = get(key)?.toIntOrNull() ?: 0

object Sqlite {
    private val driver = BundledSQLiteDriver()
    fun open(file: File, readOnly: Boolean = true): SQLiteConnection =
        driver.open(file.absolutePath, if (readOnly) 1 else 6).also {
            it.prepare("PRAGMA foreign_keys=ON").use { statement -> statement.step() }
        }
    fun validate(file: File) {
        open(file).use { db ->
            require(db.rows("PRAGMA quick_check").single().values.single() == "ok") { "Índice SQLite corrompido." }
            require(db.rows("PRAGMA foreign_key_check").isEmpty()) { "Índice com referências órfãs." }
            if (file.name == "content.sqlite3") {
                require(db.rows("PRAGMA user_version").single().values.single() == "1") { "Versão do acervo incompatível." }
                db.rows("SELECT id FROM documents LIMIT 0")
                db.rows("SELECT id FROM comments LIMIT 0")
                db.rows("SELECT page_id FROM pages_fts LIMIT 0")
            } else if (file.parentFile?.name == "corpus") {
                db.rows("SELECT id,edition_id,work_id FROM text_units LIMIT 0")
                db.rows("SELECT text_unit_id FROM text_units_fts LIMIT 0")
            } else if (file.name == "knowledge.sqlite3") {
                db.rows("SELECT id FROM ontology_entities LIMIT 0")
            }
        }
    }
}

fun SQLiteConnection.rows(sql: String, args: List<String?> = emptyList()): List<Row> =
    prepare(sql).use { statement ->
        args.forEachIndexed { index, value ->
            if (value == null) statement.bindNull(index + 1) else statement.bindText(index + 1, value)
        }
        buildList {
            while (statement.step()) add((0 until statement.getColumnCount()).associate { index ->
                statement.getColumnName(index) to if (statement.isNull(index)) null else statement.getText(index)
            })
        }
    }

fun ftsQuery(value: String): String = Regex("[\\p{L}\\p{N}]+")
    .findAll(value.take(240)).take(12).joinToString(" AND ") { "\"${it.value}\"" }
