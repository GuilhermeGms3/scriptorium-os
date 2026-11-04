package org.scriptorium.app

import android.app.Application
import android.net.Uri
import android.util.AtomicFile
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.scriptorium.app.content.ContentPackageStore
import org.scriptorium.app.data.*
import java.io.File

data class AppState(val ready: Boolean = false, val busy: Boolean = false, val message: String? = null, val revision: Int = 0)
class AppModel(application: Application) : AndroidViewModel(application) {
    val audio by lazy { org.scriptorium.app.audio.AudioClient(application) }
    override fun onCleared() { audio.close(); super.onCleared() }
    private val pointer = AtomicFile(File(application.filesDir, "active-content"))
    val store = ContentPackageStore(File(application.filesDir, "content"),
        readPointer = { if (pointer.baseFile.exists()) pointer.openRead().use { it.readBytes().toString(Charsets.UTF_8) } else null },
        activate = { id ->
            val output = pointer.startWrite()
            try { output.write(id.toByteArray()); pointer.finishWrite(output) }
            catch (failure: Exception) { pointer.failWrite(output); throw failure }
        }, validateDatabase = Sqlite::validate)
    val repository = MobileRepository(store, ReadingNavigation(org.json.JSONObject(application.assets.open("reading-labels.json").bufferedReader().use { it.readText() })))
    val personal by lazy { PersonalRepository(File(application.filesDir, "personal.sqlite3")) }
    private val mutable = MutableStateFlow(AppState(busy = true))
    val state = mutable.asStateFlow()
    init {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { personal; store.maintain() }
                val incoming = withContext(Dispatchers.IO) {
                    File(application.filesDir, "incoming").listFiles()?.filter { it.isFile && it.name.matches(Regex("[a-f0-9]{64}\\.scriptorium")) }?.sortedBy(File::lastModified)?.take(10).orEmpty()
                }
                for (delivery in incoming) {
                    mutable.value = mutable.value.copy(busy = true, message = "Preparando o acervo entregue com o aplicativo…")
                    withContext(Dispatchers.IO) {
                        store.install(delivery.inputStream()) { step -> mutable.value = mutable.value.copy(message = step) }
                        delivery.delete() // Transfer cache only; original package remains on the PC.
                    }
                }
                withContext(Dispatchers.IO) { if (store.current() != null) repository.personalSeed()?.let(personal::importDesktopSeed) }
                mutable.value = mutable.value.copy(message = store.storageNotice ?: if (incoming.isNotEmpty()) "Acervo instalado. Suas notas foram preservadas." else null)
            } catch (failure: Exception) {
                mutable.value = mutable.value.copy(message = failure.message ?: "Não foi possível preparar o acervo incluído.")
            } finally { refresh() }
        }
    }
    private suspend fun refresh() {
        try { val installed = withContext(Dispatchers.IO) { personal; store.current() != null }
            mutable.value = mutable.value.copy(ready = installed, busy = false, revision = mutable.value.revision + 1)
        } catch (failure: Exception) { mutable.value = mutable.value.copy(ready = false, busy = false, message = "Armazenamento indisponível. ${failure.message.orEmpty()} Seus dados não foram apagados.") }
    }
    fun import(uri: Uri) {
        if (mutable.value.busy) return
        mutable.value = mutable.value.copy(busy = true, message = "Conferindo pacote…")
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val input = getApplication<Application>().contentResolver.openInputStream(uri) ?: error("Não foi possível abrir o arquivo.")
                    store.install(input) { step -> mutable.value = mutable.value.copy(message = step) }
                    repository.personalSeed()?.let(personal::importDesktopSeed)
                }
                mutable.value = mutable.value.copy(message = store.storageNotice ?: "Acervo instalado. Suas notas foram preservadas.")
            } catch (failure: Exception) {
                mutable.value = mutable.value.copy(message = failure.message ?: "Falha ao instalar. O acervo anterior permanece ativo.")
            } finally { refresh() }
        }
    }
    fun dismiss() { mutable.value = mutable.value.copy(message = null) }
}
