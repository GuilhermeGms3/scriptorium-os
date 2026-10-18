package org.scriptorium.app.data

import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.content.Edition
import java.io.File
import org.json.JSONObject

data class Passage(val edition: Edition, val workId: String, val bookId: String, val title: String, val chapter: Int, val scheme: String)
data class SearchHit(val title: String, val text: String, val passage: Passage? = null, val page: Row? = null)

fun Row.commentLabel(): String {
    val payload = JSONObject(text("payload_json"))
    if (payload.optString("referenceRole") == "proof-text") return "Texto-prova confessional · não equivale a exegese"
    return when (payload.optJSONObject("contextualAnalysis")?.optString("contentType")) {
        "theological-interpretation" -> "Interpretação teológica"
        "historical-context" -> "Contexto histórico"
        "methodological-guidance" -> "Orientação metodológica"
        "homiletical-application" -> "Aplicação homilética"
        else -> "Comentário da passagem"
    }
}

fun reviewLabel(value: String): String = when (value) {
    "accepted" -> "Aceito no acervo"; "machine-proposed" -> "Proposta automática, não revisada"
    "rejected" -> "Rejeitado"; else -> value
}

/** Read-only canonical corpus IDs; no implicit equivalence between different schemes/editions. */
class MobileRepository(private val store: ContentPackageStore) {
    // Prefer the importer's explicitly stored navigation address, never integer coincidence.
    private val preferredAddress = """a.versification_scheme_id=CASE WHEN EXISTS(
        SELECT 1 FROM text_addresses x WHERE x.text_unit_id=t.id AND x.versification_scheme_id='scriptorium-bcv-1'
        ) THEN 'scriptorium-bcv-1' ELSE t.versification_scheme_id END""".trimIndent()
    private fun <T> content(block: (androidx.sqlite.SQLiteConnection) -> T): T {
        val root = store.current()?.first ?: error("Importe um pacote de acervo para começar.")
        return Sqlite.open(File(root, "content.sqlite3")).use(block)
    }
    private fun <T> corpus(edition: Edition, block: (androidx.sqlite.SQLiteConnection) -> T): T {
        val current = store.current() ?: error("Acervo não instalado.")
        require(current.second.editions.any { it == edition }) { "Edição não instalada." }
        return Sqlite.open(File(current.first, edition.path)).use(block)
    }
    fun editions(): List<Edition> = store.current()?.second?.editions.orEmpty()
    fun books(edition: Edition): List<Row> {
        val labels = store.current()?.second?.bookLabels.orEmpty()
        return corpus(edition) {
        it.rows("SELECT w.id,w.title,min(a.book_id) book_id,max(a.chapter) chapters,a.versification_scheme_id scheme FROM works w JOIN text_units t ON t.work_id=w.id JOIN text_addresses a ON a.text_unit_id=t.id WHERE t.edition_id=? AND $preferredAddress GROUP BY w.id,a.versification_scheme_id ORDER BY w.sequence", listOf(edition.id))
        }.map { row -> row + ("title" to (labels[row.text("book_id")] ?: row.text("title"))) }
    }
    fun verses(passage: Passage): List<Row> = corpus(passage.edition) {
        it.rows("SELECT t.id,t.surface_text,a.verse_start,a.display_address FROM text_units t JOIN text_addresses a ON a.text_unit_id=t.id WHERE t.edition_id=? AND t.work_id=? AND a.book_id=? AND a.chapter=? AND a.versification_scheme_id=? ORDER BY t.sequence",
            listOf(passage.edition.id, passage.workId, passage.bookId, passage.chapter.toString(), passage.scheme))
    }
    fun comments(passage: Passage): List<Row> = content {
        it.rows("""SELECT DISTINCT c.*,d.title source_title FROM comments c JOIN targets t ON t.comment_id=c.id
            JOIN documents d ON d.id=c.document_id WHERE t.work_id=? AND t.scheme_id=? AND t.book_id=?
            AND (t.chapter IS NULL OR t.chapter=?) ORDER BY c.id""".trimIndent(),
            listOf(passage.workId, passage.scheme, passage.bookId, passage.chapter.toString()))
    }
    fun targets(commentId: String): List<Row> = content { it.rows("SELECT * FROM targets WHERE comment_id=?", listOf(commentId)) }
    fun chapterTargets(passage: Passage): Map<String, List<Row>> = content {
        it.rows("SELECT * FROM targets WHERE work_id=? AND scheme_id=? AND book_id=? AND (chapter IS NULL OR chapter=?)",
            listOf(passage.workId, passage.scheme, passage.bookId, passage.chapter.toString())).groupBy { row -> row.text("comment_id") }
    }
    fun evidence(commentId: String): List<Row> = content {
        it.rows("SELECT p.*,s.start_offset,s.end_offset,s.ordinal,d.title source_title,d.checksum FROM spans s JOIN pages p ON p.id=s.page_id JOIN documents d ON d.id=p.document_id WHERE s.comment_id=? ORDER BY s.ordinal", listOf(commentId))
    }
    fun trace(commentId: String): List<Row> = content {
        it.rows("SELECT * FROM trace WHERE comment_id=? ORDER BY occurred_at,id LIMIT 200", listOf(commentId))
    }
    fun recentTrace(): List<Row> = content {
        it.rows("SELECT t.*,c.title,c.rationale,d.title source_title FROM trace t JOIN comments c ON c.id=t.comment_id JOIN documents d ON d.id=c.document_id ORDER BY t.occurred_at DESC,t.id LIMIT 100")
    }
    fun documents(): List<Row> = content { it.rows("SELECT * FROM documents ORDER BY title COLLATE NOCASE") }
    fun page(documentId: String, index: Int): Row? = content {
        it.rows("SELECT p.*,d.title source_title,d.checksum FROM pages p JOIN documents d ON d.id=p.document_id WHERE p.document_id=? AND p.page_index=?", listOf(documentId, index.toString())).firstOrNull()
    }
    fun tokens(edition: Edition, unitId: String): List<Row> = corpus(edition) {
        it.rows("SELECT id,surface_form,lemma_id,lemma_text,morphology,strongs,transliteration,language FROM tokens WHERE text_unit_id=? ORDER BY position", listOf(unitId))
    }
    fun search(value: String, edition: Edition): List<SearchHit> {
        val query = ftsQuery(value)
        if (query.isEmpty()) return emptyList()
        val scripture = corpus(edition) { db ->
            db.rows("""SELECT t.surface_text,t.work_id,w.title,a.* FROM text_units_fts f
                JOIN text_units t ON t.id=f.text_unit_id JOIN works w ON w.id=t.work_id
                JOIN text_addresses a ON a.text_unit_id=t.id WHERE text_units_fts MATCH ?
                AND t.edition_id=? AND $preferredAddress ORDER BY bm25(text_units_fts) LIMIT 40""".trimIndent(), listOf(query, edition.id))
        }.map { row -> SearchHit(row.text("display_address"), row.text("surface_text"),
            Passage(edition, row.text("work_id"), row.text("book_id"), row.text("title"), row.number("chapter"), row.text("versification_scheme_id"))) }
        val pages = content { db -> db.rows("""SELECT p.id,p.document_id,p.page_index,d.title source_title,d.checksum,
            snippet(pages_fts,1,'','', ' … ',45) excerpt FROM pages_fts f JOIN pages p ON p.id=f.page_id
            JOIN documents d ON d.id=p.document_id WHERE pages_fts MATCH ? ORDER BY bm25(pages_fts) LIMIT 40""".trimIndent(), listOf(query))
        }.map { SearchHit("${it.text("source_title")} · p. ${it.number("page_index") + 1}", it.text("excerpt"), page = it) }
        return scripture + pages
    }
    fun ontology(): List<Row> {
        val root = store.current()?.first ?: return emptyList()
        val file = File(root, "knowledge.sqlite3")
        if (!file.exists()) return emptyList()
        return Sqlite.open(file).use { it.rows("SELECT * FROM ontology_entities ORDER BY ontology_kind,canonical_name") }
    }
    fun ontologyRelations(id: String): List<Row> {
        val root = store.current()?.first ?: return emptyList()
        return Sqlite.open(File(root, "knowledge.sqlite3")).use {
            it.rows("SELECT r.*,a.canonical_name from_title,b.canonical_name to_title FROM ontology_relations r JOIN ontology_entities a ON a.id=r.from_entity_id JOIN ontology_entities b ON b.id=r.to_entity_id WHERE r.from_entity_id=? OR r.to_entity_id=?", listOf(id, id))
        }
    }
    fun pdf(checksum: String): File? {
        require(Regex("[a-f0-9]{64}").matches(checksum))
        return store.current()?.first?.let { File(it, "documents/$checksum.pdf").takeIf(File::exists) }
    }
}
