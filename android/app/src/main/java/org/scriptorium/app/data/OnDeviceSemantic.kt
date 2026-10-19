package org.scriptorium.app.data

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import org.json.JSONObject
import java.io.File
import java.nio.LongBuffer
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.PriorityQueue
import kotlin.math.sqrt

data class SemanticHit(val unitId: String, val workId: String, val bookId: String, val chapter: Int, val verse: Int, val scheme: String, val score: Float, val textChecksum: String)

object OnDeviceSemantic {
    private var openedPath: String? = null
    private var session: OrtSession? = null
    private var tokenizer: WordPieceTokenizer? = null
    private var projection: FloatArray? = null
    private val environment by lazy { OrtEnvironment.getEnvironment() }

    @Synchronized
    fun embedding(directory: File, query: String): FloatArray {
        val model = File(directory, "model.onnx")
        val config = JSONObject(File(directory, "config.json").readText())
        require(config.getString("recipe") == "distiluse-onnx-dense-tanh-l2-96-v2") { "Este índice utiliza uma receita antiga. Instale o pacote semântico atualizado." }
        if (openedPath != model.absolutePath) {
            session?.close()
            val options = OrtSession.SessionOptions().apply { setIntraOpNumThreads(2); setInterOpNumThreads(1) }
            try { session = environment.createSession(model.absolutePath, options) } finally { options.close() }
            tokenizer = WordPieceTokenizer(File(directory, "vocab.txt").readLines())
            val dense = File(directory, "dense.f32").readBytes()
            require(dense.size == (768 * 512 + 512) * 4) { "Projeção semântica inválida." }
            val floats = ByteBuffer.wrap(dense).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
            projection = FloatArray(floats.remaining()).also(floats::get)
            openedPath = model.absolutePath
        }
        val ids = requireNotNull(tokenizer).encode(query, config.getInt("maxTokens"))
        val shape = longArrayOf(1, ids.size.toLong())
        OnnxTensor.createTensor(environment, LongBuffer.wrap(ids), shape).use { input ->
            OnnxTensor.createTensor(environment, LongBuffer.wrap(LongArray(ids.size) { 1L }), shape).use { mask ->
                val feeds = mutableMapOf("input_ids" to input, "attention_mask" to mask)
                val active = requireNotNull(session)
                var types: OnnxTensor? = null
                if ("token_type_ids" in active.inputNames) {
                    types = OnnxTensor.createTensor(environment, LongBuffer.wrap(LongArray(ids.size)), shape)
                    feeds["token_type_ids"] = types
                }
                try {
                    active.run(feeds).use { result ->
                        val value = result[0].value
                        val batch = value as? Array<*> ?: error("Saída semântica inválida.")
                        val first = batch.firstOrNull()
                        val vector = if (first is FloatArray) first.copyOf() else {
                            val tokens = first as? Array<*> ?: error("Tensor semântico inválido.")
                            val rows = tokens.map { it as? FloatArray ?: error("Tensor semântico inválido.") }
                            FloatArray(rows.first().size) { dimension -> rows.sumOf { it[dimension].toDouble() }.toFloat() / rows.size }
                        }
                        require(vector.size == 768 && vector.all(Float::isFinite))
                        val dense = requireNotNull(projection)
                        val projected = FloatArray(512) { row ->
                            var value = dense[768 * 512 + row].toDouble()
                            for (column in vector.indices) value += dense[row * 768 + column].toDouble() * vector[column]
                            kotlin.math.tanh(value).toFloat()
                        }
                        require(projected.size == config.getInt("dimension"))
                        val norm = sqrt(projected.sumOf { it.toDouble() * it }).toFloat().coerceAtLeast(1e-12f)
                        return FloatArray(projected.size) { projected[it] / norm }
                    }
                } finally { types?.close() }
            }
        }
    }

    fun search(directory: File, query: String, editionId: String, limit: Int = 30): List<SemanticHit> {
        require(query.trim().length in 2..240 && limit in 1..100)
        val vector = embedding(directory, query)
        val best = PriorityQueue<SemanticHit>(compareBy { it.score })
        Sqlite.open(File(directory, "index.sqlite3")).use { db ->
            db.prepare("SELECT unit_id,work_id,book_id,chapter,verse_start,scheme,text_checksum,vector FROM vectors WHERE edition_id=?").use { statement ->
                statement.bindText(1, editionId)
                while (statement.step()) {
                    if (Thread.currentThread().isInterrupted) throw InterruptedException("Pesquisa cancelada.")
                    val blob = statement.getBlob(7)
                    require(blob.size == vector.size * 4) { "Índice vetorial incompatível." }
                    val buffer = ByteBuffer.wrap(blob).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
                    var score = 0f
                    for (index in vector.indices) score += vector[index] * buffer.get(index)
                    if (score.isFinite() && (best.size < limit || score > requireNotNull(best.peek()).score)) {
                        best.add(SemanticHit(statement.getText(0), statement.getText(1), statement.getText(2), statement.getLong(3).toInt(), statement.getLong(4).toInt(), statement.getText(5), score, statement.getText(6)))
                        if (best.size > limit) best.poll()
                    }
                }
            }
        }
        require(best.isNotEmpty()) { "Esta edição ainda não possui vetores no pacote instalado." }
        return best.sortedByDescending { it.score }
    }
}
