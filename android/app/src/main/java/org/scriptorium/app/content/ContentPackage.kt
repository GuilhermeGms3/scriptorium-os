package org.scriptorium.app.content

import org.json.JSONObject
import java.io.File
import java.io.InputStream
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.UUID
import java.util.zip.ZipInputStream
import java.io.RandomAccessFile
import java.nio.channels.OverlappingFileLockException
import java.nio.file.Files

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
            path in setOf("semantic/model.onnx", "semantic/dense.f32", "semantic/vocab.txt", "semantic/config.json", "semantic/index.sqlite3", "semantic/tokenizer.json") ||
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

/** A manifest and a local, flattened map of immutable files; package ZIPs never supply this map. */
data class InstalledContent(val directory: File, val manifest: ContentManifest, val files: Map<String, File>) {
    fun file(path: String): File = files[path] ?: error("Arquivo não instalado: $path")
}

/** Validated files are shared by reference, independent of hardlink support. Personal data is outside root. */
class ContentPackageStore(
    private val root: File,
    private val readPointer: () -> String?,
    private val activate: (String) -> Unit,
    private val validateDatabase: (File) -> Unit,
    private val availableBytes: () -> Long = { root.usableSpace },
) {
    var storageNotice: String? = null
        private set
    private val idPattern = Regex("[a-f0-9]{64}")

    @Synchronized
    fun current(): InstalledContent? = readPointer()?.let(::snapshot)

    /** Keep an in-flight database read ahead of installation/collection in this single-process app. */
    @Synchronized
    fun <T> readCurrent(block: (InstalledContent?) -> T): T = block(current())

    private fun snapshot(id: String): InstalledContent {
        require(id.matches(idPattern)) { "Registro do acervo inválido." }
        val directory = checked(File(root, id))
        val manifestFile = File(directory, "manifest.json")
        require(manifestFile.length() in 1..1_000_000) { "Manifesto local inválido." }
        val manifest = ContentManifest.parse(manifestFile.readText())
        require(manifest.id == id) { "Registro do acervo inconsistente." }
        val index = File(directory, "locations.json")
        val locations = if (index.exists()) {
            require(index.length() in 1..2_000_000) { "Índice de arquivos inválido." }
            val json = JSONObject(index.readText())
            require(json.getString("format") == "scriptorium-local-files-v1" && json.getString("id") == id)
            json.getJSONObject("files").also { files ->
                require(files.keys().asSequence().toSet() == manifest.files.map { it.path }.toSet())
            }
        } else null // Existing installations retain their original files in place, without a migration copy.
        val files = manifest.files.associate { info ->
            val relative = locations?.getString(info.path) ?: "$id/${info.path}"
            require(relative.substringBefore('/').matches(idPattern) && relative.substringAfter('/') == info.path) {
                "Localizador de arquivo inválido."
            }
            info.path to checked(File(root, relative))
        }
        return InstalledContent(directory, manifest, files)
    }

    private fun checked(file: File): File {
        require(file.canonicalPath.startsWith(root.canonicalPath + File.separator)) { "Arquivo fora do acervo privado." }
        return file
    }

    private fun <T> exclusive(block: () -> T): T {
        root.mkdirs()
        return RandomAccessFile(File(root, "install.lock"), "rw").channel.use { channel ->
            val lock = try { channel.tryLock() } catch (_: OverlappingFileLockException) { null }
            check(lock != null) { "Outro processo está instalando o acervo. Aguarde e tente novamente." }
            lock.use { block() }
        }
    }

    /** Run before exposing readers on startup, including APK-only upgrades of existing installations. */
    @Synchronized
    fun maintain() = exclusive { recover(); collectUnused() }

    private fun recover() {
        root.listFiles()?.filter { it.isDirectory && it.name.matches(Regex("\\.install-[a-f0-9-]{36}")) }?.forEach {
            checked(it)
            require(!Files.isSymbolicLink(it.toPath())) { "Staging inválido." }
            // Staging contains only this installer's validated paths. Never traverse links while reclaiming it.
            check(deleteDerived(it, emptySet(), staging = true) && !it.exists()) { "Não foi possível remover uma instalação incompleta anterior." }
        }
    }

    @Synchronized
    fun install(input: InputStream, progress: (String) -> Unit = {}): ContentManifest =
        input.use { source -> exclusive { installLocked(source, progress) } }

    private fun sameManifest(left: ContentManifest, right: ContentManifest): Boolean =
        left.id == right.id && left.files == right.files && left.editions == right.editions &&
            left.bookLabels == right.bookLabels && left.baseId == right.baseId

    private fun installLocked(input: InputStream, progress: (String) -> Unit): ContentManifest {
        storageNotice = null
        recover()
        collectUnused() // Reclaim obsolete copies from the old installer before reserving update space.
        val staging = File(root, ".install-${UUID.randomUUID()}")
        check(staging.mkdir()) { "Não foi possível preparar a instalação." }
        try {
            var manifest: ContentManifest? = null
            val received = mutableSetOf<String>()
            val locations = JSONObject()
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
                val parsed = ContentManifest.parse(header.toByteArray().toString(Charsets.UTF_8))
                manifest = parsed
                val previous = current()
                if (previous?.manifest?.id == parsed.id) {
                    require(sameManifest(previous.manifest, parsed)) { "O mesmo identificador foi usado para manifestos diferentes." }
                    return parsed
                }
                require(parsed.baseId == null || parsed.baseId == previous?.manifest?.id) {
                    "Este patch exige outra versão. Importe o pacote completo ou o patch anterior."
                }
                val destination = checked(File(root, parsed.id))
                val pending = if (destination.exists()) snapshot(parsed.id).also {
                    require(sameManifest(it.manifest, parsed)) { "Identificador já usado para outro manifesto." }
                    require(parsed.files.all { info -> it.file(info.path).isFile && it.file(info.path).length() == info.size }) { "Geração não ativada incompleta." }
                } else null
                val previousFiles = previous?.manifest?.files?.associateBy { it.path }.orEmpty()
                fun reusable(info: PackageFile): File? {
                    val candidate = pending?.files?.get(info.path)
                        ?: previous?.files?.get(info.path)?.takeIf { previousFiles[info.path] == info }
                    return candidate?.takeIf { it.isFile && it.length() == info.size }
                }
                val required = parsed.files.filter { reusable(it) == null }.sumOf { it.size }
                require(availableBytes() > required + 64 * 1024 * 1024L) {
                    "Espaço insuficiente: esta atualização precisa de ${required / (1024 * 1024)} MiB para arquivos novos, mais 64 MiB de reserva. O acervo atual foi preservado."
                }
                val expected = parsed.files.associateBy { it.path }
                while (true) {
                    val entry = zip.nextEntry ?: break
                    val info = expected[entry.name] ?: error("Arquivo inesperado no pacote.")
                    require(!entry.isDirectory && received.add(entry.name)) { "Entrada duplicada ou inválida." }
                    val label = when {
                        info.path.startsWith("documents/") -> "PDF original"
                        info.path.startsWith("semantic/") -> "busca por sentido"
                        info.path.startsWith("corpus/") -> "edição de leitura"
                        info.path == "content.sqlite3" -> "textos, comentários e estudos"
                        else -> "conhecimento e fontes"
                    }
                    progress("Instalando ${received.size}/${parsed.files.size} · $label")
                    val reuse = reusable(info)
                    val file = checked(File(staging, info.path))
                    val digest = MessageDigest.getInstance("SHA-256")
                    fun consume(output: java.io.OutputStream?) {
                        val buffer = ByteArray(1024 * 1024)
                        var total = 0L
                        while (true) {
                            val n = zip.read(buffer); if (n < 0) break
                            total += n
                            require(total <= info.size) { "Arquivo excede o tamanho declarado." }
                            digest.update(buffer, 0, n); output?.write(buffer, 0, n)
                        }
                        require(total == info.size && digest.digest().joinToString("") { "%02x".format(it) } == info.sha256) {
                            "Arquivo recebido diverge do manifesto."
                        }
                    }
                    if (reuse != null) consume(null) // Authenticate even redundant full-package entries, without copying.
                    else {
                        require(availableBytes() > info.size + 64 * 1024 * 1024L) { "O espaço disponível mudou. A instalação anterior permanece ativa." }
                        file.parentFile?.mkdirs()
                        file.outputStream().use { output -> consume(output); output.fd.sync() }
                    }
                }
                parsed.files.forEachIndexed { index, info ->
                    progress("Conferindo integridade ${index + 1}/${parsed.files.size}")
                    val written = File(staging, info.path).takeIf(File::isFile)
                    if (written == null) require(info.path in received || parsed.baseId != null) { "Arquivo ausente no pacote completo." }
                    val file = written ?: reusable(info) ?: error("Arquivo ausente no patch: ${info.path}")
                    require(file.length() == info.size && sha256(file) == info.sha256) { "Checksum divergente: ${info.path}" }
                    // Only active immutable bytes were SQL-validated. An unactivated retry is validated again.
                    if (info.path.endsWith(".sqlite3") && (written != null || file != previous?.files?.get(info.path))) validateDatabase(file)
                    locations.put(info.path, if (written != null) "${parsed.id}/${info.path}" else file.relativeTo(root).invariantSeparatorsPath)
                }
                File(staging, "manifest.json").outputStream().use { it.write(parsed.raw.toByteArray()); it.fd.sync() }
                val map = JSONObject().put("format", "scriptorium-local-files-v1").put("id", parsed.id).put("files", locations)
                File(staging, "locations.json").outputStream().use { it.write(map.toString().toByteArray()); it.fd.sync() }
            }
            val parsed = checkNotNull(manifest)
            val destination = File(root, parsed.id)
            if (!destination.exists()) check(staging.renameTo(destination)) { "Não foi possível concluir a instalação." }
            activate(parsed.id)
            check(readPointer() == parsed.id) { "Ativação não confirmada. Nenhum arquivo anterior foi removido." }
            collectUnused()
            return parsed
        } finally {
            if (staging.exists()) deleteDerived(staging, emptySet(), staging = true)
        }
    }

    /** Mark by flattened physical path, not by old version: unchanged PDFs/corpora survive without copies. */
    private fun collectUnused() {
        val active = current() ?: return // No confirmed pointer: retain any recoverable generation.
        require(active.manifest.files.all { active.file(it.path).isFile && active.file(it.path).length() == it.size }) {
            "Acervo ativo incompleto. A limpeza foi interrompida para preservar os arquivos existentes."
        }
        val keep = active.files.values.map { it.canonicalPath }.toSet() +
            File(active.directory, "manifest.json").canonicalPath + File(active.directory, "locations.json").canonicalPath
        var complete = true
        root.listFiles()?.filter { it.isDirectory && it.name.matches(idPattern) && !Files.isSymbolicLink(it.toPath()) }?.forEach {
            if (!deleteDerived(checked(it), keep)) complete = false
        }
        storageNotice = if (complete) null else "Acervo instalado, mas alguns arquivos obsoletos não puderam ser removidos. A limpeza será tentada na próxima abertura."
    }

    private fun deleteDerived(directory: File, keep: Set<String>, staging: Boolean = false): Boolean {
        var complete = true
        directory.walkBottomUp().onEnter { !Files.isSymbolicLink(it.toPath()) && checked(it).isDirectory }.forEach { file ->
            if (Files.isSymbolicLink(file.toPath())) { complete = false; return@forEach }
            if (file.isDirectory) {
                if (file.listFiles()?.isEmpty() == true && !file.delete()) complete = false
            } else {
                val relative = file.relativeTo(directory).invariantSeparatorsPath
                if ((staging || relative in setOf("manifest.json", "locations.json") || ContentManifest.safePath(relative)) &&
                    checked(file).canonicalPath !in keep && !file.delete()) complete = false
            }
        }
        return complete
    }
}
