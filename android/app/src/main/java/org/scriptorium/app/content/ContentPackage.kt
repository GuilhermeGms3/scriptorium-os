package org.scriptorium.app.content

import org.json.JSONObject
import java.io.File
import java.io.InputStream
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.UUID
import java.util.zip.ZipInputStream

data class PackageFile(val path: String, val sha256: String, val size: Long)
data class Edition(val id: String, val title: String, val path: String)
data class ContentManifest(
    val id: String, val baseId: String?, val files: List<PackageFile>,
    val editions: List<Edition>, val raw: String, val bookLabels: Map<String, String> = emptyMap(),
) {
    companion object {
        fun parse(raw: String): ContentManifest {
            require(raw.length <= 1_000_000) { "Manifesto excessivamente grande." }
            val json = JSONObject(raw)
            require(json.getString("format") == "scriptorium-mobile-v1") { "Formato incompatível." }
            require(json.getInt("schemaVersion") == 1) { "Atualize o aplicativo para este pacote." }
            val id = json.getString("id")
            require(id.matches(Regex("[a-f0-9]{64}"))) { "Identificador inválido." }
            val base = json.optString("baseId").takeIf { it.isNotEmpty() }
            require(base == null || base.matches(Regex("[a-f0-9]{64}"))) { "Base inválida." }
            val list = json.getJSONArray("files")
            require(list.length() in 1..2000) { "Quantidade de arquivos inválida." }
            val files = (0 until list.length()).map { index ->
                val item = list.getJSONObject(index)
                val path = item.getString("path")
                require(safePath(path)) { "Caminho não permitido." }
                val hash = item.getString("sha256")
                val size = item.getLong("size")
                require(hash.matches(Regex("[a-f0-9]{64}")) && size in 1..4_294_967_296L) {
                    "Integridade ou tamanho inválido."
                }
                PackageFile(path, hash, size)
            }
            require(files.map { it.path }.distinct().size == files.size) { "Arquivos duplicados." }
            require(files.sumOf { it.size } <= 12_884_901_888L) { "Pacote excede 12 GiB." }
            require(files.any { it.path == "content.sqlite3" }) { "Acervo ausente." }
            val source = json.getJSONArray("editions")
            val editions = (0 until source.length()).map { index ->
                val item = source.getJSONObject(index)
                Edition(item.getString("id"), item.getString("title"), item.getString("path"))
            }
            require(editions.isNotEmpty() && editions.size <= 100) { "Edições ausentes ou excessivas." }
            require(editions.map { it.id }.distinct().size == editions.size) { "Edições duplicadas." }
            require(editions.all { edition ->
                edition.id.length in 1..200 && edition.title.length in 1..500 &&
                    edition.path.startsWith("corpus/") && files.any { it.path == edition.path }
            }) { "Edição sem arquivo correspondente." }
            val labels = json.optJSONObject("bookLabels")
            val bookLabels = labels?.keys()?.asSequence()?.associateWith { labels.getString(it).take(500) }.orEmpty()
            return ContentManifest(id, base, files, editions, raw, bookLabels)
        }

        fun safePath(path: String): Boolean = path == "content.sqlite3" || path == "knowledge.sqlite3" ||
            Regex("corpus/[a-z0-9][a-z0-9.-]{0,160}\\.sqlite3").matches(path) ||
            Regex("documents/[a-f0-9]{64}\\.pdf").matches(path)
    }
}

fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().buffered().use { input ->
        val buffer = ByteArray(1024 * 1024)
        while (true) { val n = input.read(buffer); if (n < 0) break; digest.update(buffer, 0, n) }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

/** Immutable generations; only the pointer is activated, never the personal database. */
class ContentPackageStore(
    private val root: File,
    private val readPointer: () -> String?,
    private val activate: (String) -> Unit,
    private val validateDatabase: (File) -> Unit,
) {
    fun current(): Pair<File, ContentManifest>? {
        val id = readPointer() ?: return null
        require(id.matches(Regex("[a-f0-9]{64}"))) { "Registro do acervo inválido." }
        val directory = File(root, id)
        val manifest = ContentManifest.parse(File(directory, "manifest.json").readText())
        require(manifest.id == id) { "Registro do acervo inconsistente." }
        return directory to manifest
    }

    @Synchronized
    fun install(input: InputStream, progress: (String) -> Unit = {}): ContentManifest {
        root.mkdirs()
        val staging = File(root, ".install-${UUID.randomUUID()}")
        check(staging.mkdir()) { "Não foi possível preparar a instalação." }
        try {
            var manifest: ContentManifest? = null
            val received = mutableSetOf<String>()
            ZipInputStream(input.buffered()).use { zip ->
                val first = zip.nextEntry ?: error("Pacote vazio.")
                require(first.name == "manifest.json" && !first.isDirectory) { "Manifesto deve abrir o pacote." }
                val header = ByteArrayOutputStream()
                val headerBuffer = ByteArray(8192)
                while (true) {
                    val n = zip.read(headerBuffer); if (n < 0) break
                    require(header.size() + n <= 1_000_000) { "Manifesto excessivamente grande." }
                    header.write(headerBuffer, 0, n)
                }
                val bytes = header.toByteArray()
                require(bytes.size <= 1_000_000) { "Manifesto excessivamente grande." }
                val parsed = ContentManifest.parse(bytes.toString(Charsets.UTF_8))
                manifest = parsed
                val previous = current()
                if (previous?.second?.id == parsed.id) return parsed
                require(parsed.baseId == null || parsed.baseId == previous?.second?.id) {
                    "Este patch exige outra versão. Importe o pacote completo ou o patch anterior."
                }
                require(root.usableSpace > parsed.files.sumOf { it.size } + 64 * 1024 * 1024L) {
                    "Espaço insuficiente para instalar sem apagar o acervo atual."
                }
                val expected = parsed.files.associateBy { it.path }
                while (true) {
                    val entry = zip.nextEntry ?: break
                    val info = expected[entry.name] ?: error("Arquivo inesperado no pacote.")
                    require(!entry.isDirectory && received.add(entry.name)) { "Entrada duplicada ou inválida." }
                    progress("Conferindo ${entry.name}")
                    val file = File(staging, info.path)
                    file.parentFile?.mkdirs()
                    file.outputStream().use { output ->
                        val buffer = ByteArray(1024 * 1024)
                        var total = 0L
                        while (true) {
                            val n = zip.read(buffer); if (n < 0) break
                            total += n
                            require(total <= info.size) { "Arquivo excede o tamanho declarado." }
                            output.write(buffer, 0, n)
                        }
                        require(total == info.size) { "Arquivo incompleto." }
                        output.fd.sync()
                    }
                }
                parsed.files.forEach { info ->
                    val file = File(staging, info.path)
                    if (!file.exists()) {
                        require(parsed.baseId != null && previous != null) { "Arquivo ausente no pacote completo." }
                        val old = previous.second.files.find { it.path == info.path }
                        require(old?.sha256 == info.sha256 && old.size == info.size) { "Arquivo ausente no patch." }
                        file.parentFile?.mkdirs()
                        File(previous.first, info.path).copyTo(file)
                    }
                    require(file.length() == info.size && sha256(file) == info.sha256) { "Checksum divergente: ${info.path}" }
                    if (info.path.endsWith(".sqlite3")) validateDatabase(file)
                }
                File(staging, "manifest.json").outputStream().use {
                    it.write(parsed.raw.toByteArray(Charsets.UTF_8)); it.fd.sync()
                }
            }
            val parsed = checkNotNull(manifest)
            val destination = File(root, parsed.id)
            // A generation left before activation is validated again, not trusted by its name.
            if (destination.exists()) {
                parsed.files.forEach { require(sha256(File(destination, it.path)) == it.sha256) }
                staging.deleteRecursively()
            } else check(staging.renameTo(destination)) { "Não foi possível concluir a instalação." }
            activate(parsed.id)
            return parsed
        } finally {
            staging.deleteRecursively()
        }
    }
}
