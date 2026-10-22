package org.scriptorium.app.data

import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.content.Edition
import java.io.File
import org.json.JSONObject
import org.json.JSONArray

data class Passage(val edition: Edition, val workId: String, val bookId: String, val title: String, val chapter: Int, val scheme: String, val verse: Int? = null, val verseEnd: Int? = null)
data class StudyReading(val id: String, val title: String, val reason: String, val work: Row? = null, val page: Row? = null)

data class SearchHit(val title: String, val text: String, val passage: Passage? = null, val page: Row? = null)

enum class LocalSearchScope { ALL, SCRIPTURE, LIBRARY, EXEGESIS, HERMENEUTICS }

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
class MobileRepository(private val store: ContentPackageStore, val navigation: ReadingNavigation = ReadingNavigation()) {
    private val editionCache = java.util.concurrent.ConcurrentHashMap<String, List<Edition>>()
    private val bookCache = java.util.concurrent.ConcurrentHashMap<String, List<Row>>()
    // Prefer the importer's explicitly stored navigation address, never integer coincidence.
    private val preferredAddress = """a.versification_scheme_id=CASE WHEN EXISTS(
        SELECT 1 FROM text_addresses x WHERE x.text_unit_id=t.id AND x.versification_scheme_id='scriptorium-bcv-1'
        ) THEN 'scriptorium-bcv-1' ELSE t.versification_scheme_id END""".trimIndent()
    private fun <T> content(block: (androidx.sqlite.SQLiteConnection) -> T): T {
        return store.readCurrent { current ->
            val installed = current ?: error("Importe um pacote de acervo para começar.")
            Sqlite.open(installed.file("content.sqlite3")).use(block)
        }
    }
    private fun <T> corpus(edition: Edition, block: (androidx.sqlite.SQLiteConnection) -> T): T {
        return store.readCurrent { snapshot ->
            val current = snapshot ?: error("Acervo não instalado.")
            require(current.manifest.editions.any { it == edition }) { "Edição não instalada." }
            Sqlite.open(current.file(edition.path)).use(block)
        }
    }
    fun editions(): List<Edition> = store.current()?.manifest?.editions.orEmpty()
    fun scriptureEditions(): List<Edition> {
        val generation = store.current()?.manifest?.id ?: "uninstalled"
        return editionCache.getOrPut(generation) {
            editions().filter { edition -> corpus(edition) {
                it.rows("SELECT 1 FROM text_addresses a JOIN text_units t ON t.id=a.text_unit_id WHERE t.edition_id=? AND a.chapter IS NOT NULL LIMIT 1", listOf(edition.id)).isNotEmpty()
            } }
        }
    }
    fun readingBooks(): List<ReadingBook> = readingBookCatalog(scriptureEditions().map { it to books(it) })
    fun books(edition: Edition): List<Row> {
        val cacheKey = "${store.current()?.manifest?.id}:${edition.id}"
        return bookCache.getOrPut(cacheKey) {
            val labels = store.current()?.manifest?.bookLabels.orEmpty()
            corpus(edition) {
                it.rows("SELECT w.id,w.title,min(a.book_id) book_id,max(a.chapter) chapters,a.versification_scheme_id scheme FROM works w JOIN text_units t ON t.work_id=w.id JOIN text_addresses a ON a.text_unit_id=t.id WHERE t.edition_id=? AND $preferredAddress GROUP BY w.id,a.versification_scheme_id ORDER BY w.sequence", listOf(edition.id))
            }.map { row -> row + ("title" to navigation.bookTitle(row.text("book_id"), labels[row.text("book_id")] ?: row.text("title"))) }
        }
    }
    fun verses(passage: Passage): List<Row> = corpus(passage.edition) {
        it.rows("SELECT t.id,t.surface_text,a.verse_start,a.verse_end,a.display_address FROM text_units t JOIN text_addresses a ON a.text_unit_id=t.id WHERE t.edition_id=? AND t.work_id=? AND a.book_id=? AND a.chapter=? AND a.versification_scheme_id=? ORDER BY t.sequence",
            listOf(passage.edition.id, passage.workId, passage.bookId, passage.chapter.toString(), passage.scheme))
    }
    fun comments(passage: Passage): List<Row> = content {
        it.rows("""SELECT DISTINCT c.*,d.title source_title,d.language source_language FROM comments c JOIN targets t ON t.comment_id=c.id
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
        it.rows("SELECT p.*,s.start_offset,s.end_offset,s.ordinal,d.title source_title,d.checksum,d.language,d.pages document_pages FROM spans s JOIN pages p ON p.id=s.page_id JOIN documents d ON d.id=p.document_id WHERE s.comment_id=? ORDER BY s.ordinal", listOf(commentId))
    }
    fun trace(commentId: String): List<Row> = content {
        it.rows("SELECT * FROM trace WHERE comment_id=? ORDER BY occurred_at,id LIMIT 200", listOf(commentId))
    }
    fun recentTrace(): List<Row> = content {
        it.rows("SELECT t.*,c.title,c.rationale,d.title source_title FROM trace t JOIN comments c ON c.id=t.comment_id JOIN documents d ON d.id=c.document_id ORDER BY t.occurred_at DESC,t.id LIMIT 100")
    }
    fun documents(): List<Row> = content { it.rows("SELECT * FROM documents ORDER BY title COLLATE NOCASE") }
    fun page(documentId: String, index: Int): Row? = content {
        it.rows("SELECT p.*,d.title source_title,d.checksum,d.language,d.pages document_pages FROM pages p JOIN documents d ON d.id=p.document_id WHERE p.document_id=? AND p.page_index=?", listOf(documentId, index.toString())).firstOrNull()
    }
    fun tokens(edition: Edition, unitId: String): List<Row> = corpus(edition) {
        it.rows("SELECT id,surface_form,lemma_id,lemma_text,morphology,strongs,transliteration,language FROM tokens WHERE text_unit_id=? ORDER BY position", listOf(unitId))
    }
    fun search(value: String, edition: Edition, scope: LocalSearchScope = LocalSearchScope.ALL): List<SearchHit> {
        val query = ftsQuery(value)
        if (query.isEmpty()) return emptyList()
        val scripture = if (scope !in setOf(LocalSearchScope.ALL, LocalSearchScope.SCRIPTURE)) emptyList() else corpus(edition) { db ->
            db.rows("""SELECT t.surface_text,t.work_id,w.title,a.* FROM text_units_fts f
                JOIN text_units t ON t.id=f.text_unit_id JOIN works w ON w.id=t.work_id
                JOIN text_addresses a ON a.text_unit_id=t.id WHERE text_units_fts MATCH ?
                AND t.edition_id=? AND $preferredAddress ORDER BY bm25(text_units_fts) LIMIT 40""".trimIndent(), listOf(query, edition.id))
        }.map { row -> SearchHit(navigation.reference(row.text("book_id"), row.text("title"), row.number("chapter"), row["verse_start"]?.toIntOrNull(), row["verse_end"]?.toIntOrNull()), row.text("surface_text"),
            Passage(edition, row.text("work_id"), row.text("book_id"), navigation.bookTitle(row.text("book_id"), row.text("title")), row.number("chapter"), row.text("versification_scheme_id"), row["verse_start"]?.toIntOrNull(), row["verse_end"]?.toIntOrNull())) }
        val types = when (scope) {
            LocalSearchScope.EXEGESIS -> listOf("exegetical-note", "exegetical-commentary", "textual-observation", "source-commentary")
            LocalSearchScope.HERMENEUTICS -> listOf("methodological-guidance")
            else -> emptyList()
        }
        // Classify each comment once, then use the spans primary key instead of a correlated page scan.
        val subjectFilter = if (types.isEmpty()) "" else "AND p.id IN (SELECT s.page_id FROM spans s WHERE s.comment_id IN (SELECT c.id FROM comments c WHERE json_extract(c.payload_json,'$.contextualAnalysis.contentType') IN (${types.joinToString(",") { "?" }})))"
        val pages = if (scope == LocalSearchScope.SCRIPTURE) emptyList() else content { db -> db.rows("""SELECT p.id,p.document_id,p.page_index,d.title source_title,d.checksum,d.pages document_pages,
            snippet(pages_fts,1,'','', ' … ',45) excerpt FROM pages_fts f JOIN pages p ON p.id=f.page_id
            JOIN documents d ON d.id=p.document_id WHERE pages_fts MATCH ? $subjectFilter ORDER BY bm25(pages_fts) LIMIT 40""".trimIndent(), listOf(query) + types)
        }.map { SearchHit("${it.text("source_title")} · p. ${it.number("page_index") + 1}", it.text("excerpt"), page = it) }
        return scripture + pages
    }
    fun ontology(): List<Row> {
        return store.readCurrent { current ->
            val file = current?.files?.get("knowledge.sqlite3")
            if (file == null) emptyList() else Sqlite.open(file).use { it.rows("SELECT * FROM ontology_entities ORDER BY ontology_kind,canonical_name") }
        }
    }
    fun ontologyRelations(id: String): List<Row> {
        return store.readCurrent { current ->
            val file = current?.files?.get("knowledge.sqlite3")
            if (file == null) emptyList() else Sqlite.open(file).use {
                it.rows("SELECT r.*,a.canonical_name from_title,b.canonical_name to_title FROM ontology_relations r JOIN ontology_entities a ON a.id=r.from_entity_id JOIN ontology_entities b ON b.id=r.to_entity_id WHERE r.from_entity_id=? OR r.to_entity_id=?", listOf(id, id))
            }
        }
    }
    fun pdf(checksum: String): File? {
        require(Regex("[a-f0-9]{64}").matches(checksum))
        return store.current()?.files?.get("documents/$checksum.pdf")?.takeIf(File::exists)
    }

    fun personalSeed(): String? = content { db ->
        if (db.rows("SELECT 1 FROM sqlite_master WHERE name='personal_seed'").isEmpty()) null
        else db.rows("SELECT payload_json FROM personal_seed WHERE id='desktop-personal-v1'").firstOrNull()?.get("payload_json")
    }
    fun catalog(kind: String): List<Row> = (content { it.rows("SELECT id,kind,title FROM reading_catalog WHERE kind=? ORDER BY title", listOf(kind)) } +
        if (kind == "course") navigation.formation()?.let { listOf(mapOf("id" to it.getString("id"), "kind" to "course", "title" to it.getString("title"))) }.orEmpty() else emptyList())
        .distinctBy { it.text("id") }
        .map { row -> row + ("title" to navigation.topic(row.text("id").removePrefix("lesson:"), row.text("title"))) }
        .sortedBy { it.text("title") }
    fun catalogItem(id: String): JSONObject? = (navigation.formation(id)
        ?: content { it.rows("SELECT payload_json FROM reading_catalog WHERE id=?", listOf(id)).firstOrNull()?.get("payload_json")?.let(::JSONObject) })?.also { json ->
        if (id.startsWith("lesson:")) {
            val title = navigation.topic(id.removePrefix("lesson:"), json.optString("title"))
            json.put("title", title)
            json.objects("chapters").filter { it.optString("id").startsWith("overview:") }.forEach { it.put("title", title) }
        }
    }
    fun lessonReadings(id: String, title: String): List<StudyReading> {
        val assigned = navigation.lesson(id)?.objects("works").orEmpty()
        val works = if (assigned.isEmpty()) emptyList() else primaryWorks()
        val linked = assigned.mapNotNull { resource -> works.find { it.text("id") == resource.optString("workId") }?.let { work ->
            StudyReading("work:${work.text("id")}", work.text("title"), "Leitura vinculada · ${resource.optString("role", "fonte do percurso")}", work = work)
        } }
        val terms = title.split(Regex("[^\\p{L}\\p{N}]+" )).filter { it.length > 3 && normalizedReading(it) !in setOf("sobre", "entre", "para", "como", "estudo", "historia") }.take(3)
        val query = ftsQuery(terms.joinToString(" "))
        val found = readingPages(query, "Encontrado no acervo")
        if (linked.isNotEmpty() || found.isNotEmpty()) return (linked + found).distinctBy { it.id }
        val area = navigation.lessonSupport(id) ?: return emptyList()
        val supportWorks = if (works.isNotEmpty()) works else primaryWorks()
        val support = area.objects("works").mapNotNull { resource -> supportWorks.find { it.text("id") == resource.optString("workId") }?.let { work ->
            StudyReading("work:${work.text("id")}", work.text("title"), "Apoio à área · ${area.getString("title")}", work = work)
        } }
        val nearby = area.strings("keywords").take(3).firstNotNullOfOrNull { keyword ->
            readingPages(ftsQuery(keyword), "Apoio à área · ${area.getString("title")}").takeIf { it.isNotEmpty() }
        }.orEmpty()
        return (support + nearby).distinctBy { it.id }
    }
    private fun readingPages(query: String, label: String): List<StudyReading> {
        if (query.isBlank()) return emptyList()
        return content { db ->
            db.rows("""SELECT p.id,p.document_id,p.page_index,d.title source_title,d.checksum,d.pages document_pages,
                snippet(pages_fts,1,'','', ' … ',28) excerpt FROM pages_fts f JOIN pages p ON p.id=f.page_id
                JOIN documents d ON d.id=p.document_id WHERE pages_fts MATCH ? ORDER BY bm25(pages_fts) LIMIT 12""".trimIndent(), listOf(query))
        }.map { page -> StudyReading("page:${page.text("id")}", page.text("source_title"), "$label · p. ${page.number("page_index") + 1}", page = page) }
    }

    fun outline(documentId: String): List<Row> = content { it.rows("SELECT * FROM document_outline WHERE document_id=? ORDER BY ordinal", listOf(documentId)) }
    fun bibliography(): List<Row> = content { it.rows("SELECT * FROM bibliography ORDER BY title") }
    fun preparedTranslation(sourceId: String, text: String): Row? = content { db ->
        if (db.rows("SELECT 1 FROM sqlite_master WHERE name='prepared_translations'").isEmpty()) null
        else {
            val checksum = java.security.MessageDigest.getInstance("SHA-256").digest(text.toByteArray()).joinToString("") { "%02x".format(it) }
            db.rows("SELECT * FROM prepared_translations WHERE source_id=? AND source_checksum=? AND language IN ('pt','pt-BR') LIMIT 1", listOf(sourceId, checksum)).singleOrNull()
        }
    }
    fun editionMetadata(edition: Edition): Row = corpus(edition) { it.rows("SELECT * FROM corpus_editions WHERE id=?", listOf(edition.id)).single() }
    fun primaryWorks(): List<Row> = editions().flatMap { edition -> corpus(edition) { db ->
        db.rows("SELECT w.id,w.title,count(t.id) unit_count,max(a.chapter) chapters FROM works w JOIN text_units t ON t.work_id=w.id LEFT JOIN text_addresses a ON a.text_unit_id=t.id WHERE t.edition_id=? GROUP BY w.id ORDER BY w.sequence", listOf(edition.id))
            .map { row -> row + mapOf("title" to navigation.workTitle(row.text("id"), row.text("title")), "edition_id" to edition.id, "edition_title" to edition.title, "edition_path" to edition.path) }
    } }
    fun primaryUnits(edition: Edition, workId: String, offset: Int = 0): List<Row> = corpus(edition) {
        it.rows("SELECT t.*,coalesce((SELECT display_address FROM text_addresses a WHERE a.text_unit_id=t.id ORDER BY a.id LIMIT 1),'') display_address FROM text_units t WHERE t.work_id=? AND t.edition_id=? ORDER BY t.sequence LIMIT 80 OFFSET ?", listOf(workId, edition.id, offset.coerceAtLeast(0).toString()))
    }
    /** A real heading in an installed volume, not a claim of a separate corpus edition. */
    fun ancientReadingSections(): List<Row> = content { db ->
        db.rows("""SELECT p.*,d.title source_title,d.pages document_pages,d.checksum FROM pages_fts f
            JOIN pages p ON p.id=f.page_id JOIN documents d ON d.id=p.document_id
            WHERE pages_fts MATCH ? AND (lower(trim(p.text)) LIKE 'el evangelio de judas%'
            OR lower(trim(p.text)) LIKE 'evangelho de judas%' OR lower(trim(p.text)) LIKE 'gospel of judas%')
            ORDER BY d.title,p.page_index LIMIT 5""".trimIndent(), listOf("\"evangelio de judas\" OR \"evangelho de judas\" OR \"gospel of judas\""))
            .map { it + ("title" to "Evangelho de Judas") }
    }
    fun originalEditions(passage: Passage): List<Edition> = editions().filter { edition -> corpus(edition) {
        it.rows("SELECT e.id FROM corpus_editions e WHERE e.id=? AND e.language IN ('grc','he','hbo','arc') AND EXISTS(SELECT 1 FROM text_units t WHERE t.edition_id=e.id AND t.work_id=?)", listOf(edition.id, passage.workId)).isNotEmpty()
    } }
    fun parallel(passage: Passage): List<Pair<Edition, List<Row>>> = editions().mapNotNull { edition ->
        val rows = verses(passage.copy(edition = edition))
        if (rows.isEmpty()) null else edition to rows
    }
    fun lexicalEntries(edition: Edition, token: Row): List<Row> = corpus(edition) { db ->
        val references = buildSet {
            add(token.text("lemma_id")); add(token.text("strongs"))
            Regex("[GH]?\\d+[a-z]?").findAll(token.text("lemma_id") + " " + token.text("strongs")).forEach { match ->
                add(match.value)
                add((if (token.text("language") in listOf("hbo", "he", "arc")) "H" else "G") + match.value.trimStart('H', 'G'))
            }
        }.filter(String::isNotBlank).take(20)
        val keys = references.joinToString(",") { "?" }
        if (references.isEmpty()) emptyList() else db.rows("SELECT DISTINCT l.*,s.title source_title FROM lexemes l JOIN sources s ON s.id=l.source_id LEFT JOIN lexical_references r ON r.lexeme_id=l.id WHERE l.lemma=? OR l.id=? OR l.strongs IN ($keys) OR r.reference_value IN ($keys) LIMIT 30", listOf(token.text("lemma_text"), token.text("lemma_id")) + references + references)
    }
    fun lexicalSenses(edition: Edition, lexeme: String): List<Row> = corpus(edition) { it.rows("SELECT * FROM lexical_senses WHERE lexeme_id=? ORDER BY ordinal", listOf(lexeme)) }
    fun occurrences(edition: Edition, token: Row): List<Row> = corpus(edition) {
        val (condition, args) = lexicalPredicate(token)
        it.rows("SELECT t.surface_form,t.text_unit_id,u.work_id,a.book_id,a.chapter,a.verse_start,a.versification_scheme_id,a.display_address FROM tokens t JOIN text_units u ON u.id=t.text_unit_id JOIN text_addresses a ON a.text_unit_id=u.id WHERE $condition AND a.versification_scheme_id=? ORDER BY u.work_id,u.sequence,t.position LIMIT 200", args + "scriptorium-bcv-1")
    }
    fun lexicalStatistics(edition: Edition, token: Row): Pair<List<Row>, List<Row>> = corpus(edition) {
        val (condition, args) = lexicalPredicate(token)
        val distribution = it.rows("SELECT w.title,count(*) count FROM tokens t JOIN text_units u ON u.id=t.text_unit_id JOIN works w ON w.id=u.work_id WHERE $condition GROUP BY w.id ORDER BY count DESC", args)
        val neighbors = it.rows("SELECT n.surface_form,n.lemma_text,count(*) count FROM tokens t JOIN tokens n ON n.text_unit_id=t.text_unit_id AND n.position IN (t.position-1,t.position+1) WHERE $condition GROUP BY n.surface_form,n.lemma_text ORDER BY count DESC LIMIT 30", args)
        distribution to neighbors
    }
    private fun lexicalPredicate(token: Row): Pair<String, List<String>> = when {
        token.text("lemma_id").isNotBlank() -> "t.lemma_id=?" to listOf(token.text("lemma_id"))
        token.text("strongs").isNotBlank() -> "t.strongs=?" to listOf(token.text("strongs"))
        else -> "0=1" to emptyList()
    }
    fun publicClaims(): List<Row> = knowledge { it.rows("SELECT * FROM claims ORDER BY claim_type,id") }
    fun arguments(claimId: String): List<Row> = knowledge { it.rows("SELECT a.*,c.proposition conclusion FROM arguments a JOIN claims c ON c.id=a.conclusion_claim_id WHERE a.conclusion_claim_id=? OR a.id IN (SELECT argument_id FROM argument_premises WHERE claim_id=?)", listOf(claimId, claimId)) }
    fun argumentDetail(id: String): Pair<List<Row>, List<Row>> = knowledge { db ->
        db.rows("SELECT c.* FROM argument_premises p JOIN claims c ON c.id=p.claim_id WHERE p.argument_id=? ORDER BY p.ordinal", listOf(id)) to
            db.rows("SELECT * FROM argument_relations WHERE from_id=? OR to_id=?", listOf(id, id))
    }
    fun privateRecords(kind: String): List<Row> = content { it.rows("SELECT r.*,d.title source_title FROM private_records r JOIN documents d ON d.id=r.document_id WHERE kind=? ORDER BY id LIMIT 200", listOf(kind)) }
    private fun <T> knowledge(block: (androidx.sqlite.SQLiteConnection) -> T): T {
        return store.readCurrent { current -> Sqlite.open(requireNotNull(current) { "Acervo não instalado." }.file("knowledge.sqlite3")).use(block) }
    }
    fun marksForSource(commentId: String): List<Row> = trace(commentId)
    fun visuals(passage: Passage): List<Row> = comments(passage).filter { row -> JSONObject(row.text("payload_json")).optJSONObject("contextualAnalysis")?.optJSONObject("sourceVisual") != null }

    fun semanticSearch(query: String, edition: Edition): List<SearchHit> {
        return store.readCurrent { snapshot ->
            val current = snapshot ?: error("Acervo não instalado.")
            require("semantic/config.json" in current.files) { "Este pacote não contém o modelo e o índice por sentido. Gere-os no PC e instale o patch." }
            val hits = OnDeviceSemantic.search({ name -> current.file("semantic/$name") }, query, edition.id)
            corpus(edition) { db -> hits.mapNotNull { hit ->
                val row = db.rows("SELECT t.surface_text,w.title FROM text_units t JOIN works w ON w.id=t.work_id WHERE t.id=? AND t.edition_id=?", listOf(hit.unitId, edition.id)).singleOrNull() ?: return@mapNotNull null
                val checksum = java.security.MessageDigest.getInstance("SHA-256").digest(row.text("surface_text").toByteArray()).joinToString("") { "%02x".format(it) }
                require(checksum == hit.textChecksum) { "Índice semântico desatualizado para esta edição. Instale um pacote coerente." }
                SearchHit("${navigation.reference(hit.bookId, row.text("title"), hit.chapter, hit.verse)} · por sentido", row.text("surface_text"), Passage(edition, hit.workId, hit.bookId, navigation.bookTitle(hit.bookId, row.text("title")), hit.chapter, hit.scheme, hit.verse))
            } }
        }
    }

    fun resolveReference(value: String, edition: Edition): Passage? {
        val ref = navigation.parse(value, books(edition)) ?: return null
        val passage = Passage(edition, ref.book.text("id"), ref.book.text("book_id"), ref.book.text("title"), ref.chapter, ref.book.text("scheme"), ref.verse, ref.end)
        if (ref.verse != null) {
            val rows = verses(passage)
            fun contains(number: Int) = rows.any { number in it.number("verse_start")..it.number("verse_end").coerceAtLeast(it.number("verse_start")) }
            if (!contains(ref.verse) || (ref.end != null && !contains(ref.end))) return null
        }
        return passage
    }

    fun tracePayload(id: String): String? = content { db ->
        if (db.rows("SELECT 1 FROM sqlite_master WHERE name='trace_payloads'").isEmpty()) null
        else db.rows("SELECT payload_json FROM trace_payloads WHERE id=?", listOf(id)).firstOrNull()?.get("payload_json")
    }
    fun traceEvents(query: String, offset: Int): List<Row> = content { db ->
        require(offset >= 0 && query.length <= 200)
        db.rows("SELECT t.*,c.title,c.rationale,d.title source_title FROM trace t JOIN comments c ON c.id=t.comment_id JOIN documents d ON d.id=c.document_id WHERE (?='' OR instr(lower(d.title||' '||c.title),lower(?))>0) ORDER BY t.occurred_at DESC,t.id LIMIT 50 OFFSET ?", listOf(query, query, offset.toString()))
    }
    fun comment(id: String): Row? = content { it.rows("SELECT c.*,d.title source_title,d.language source_language FROM comments c JOIN documents d ON d.id=c.document_id WHERE c.id=?", listOf(id)).singleOrNull() }
}

fun JSONObject.objects(key: String): List<JSONObject> = optJSONArray(key)?.let { array -> (0 until array.length()).map(array::getJSONObject) }.orEmpty()
fun JSONObject.strings(key: String): List<String> = optJSONArray(key)?.let { array -> (0 until array.length()).map(array::getString) }.orEmpty()
