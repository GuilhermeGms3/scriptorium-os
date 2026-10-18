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
    private val pointer = AtomicFile(File(application.filesDir, "active-content"))
    val store = ContentPackageStore(File(application.filesDir, "content"),
        readPointer = { if (pointer.baseFile.exists()) pointer.openRead().use { it.readBytes().toString(Charsets.UTF_8) } else null },
        activate = { id ->
            val output = pointer.startWrite()
            try { output.write(id.toByteArray()); pointer.finishWrite(output) }
            catch (failure: Exception) { pointer.failWrite(output); throw failure }
        }, validateDatabase = Sqlite::validate)
    val repository = MobileRepository(store)
    val personal = PersonalRepository(File(application.filesDir, "personal.sqlite3"))
    private val mutable = MutableStateFlow(AppState())
    val state = mutable.asStateFlow()
    init { viewModelScope.launch { refresh() } }
    private suspend fun refresh() {
        try { val installed = withContext(Dispatchers.IO) { store.current() != null }
            mutable.value = mutable.value.copy(ready = installed, busy = false, revision = mutable.value.revision + 1)
        } catch (_: Exception) { mutable.value = mutable.value.copy(ready = false, busy = false, message = "Acervo indisponível. Reimporte um pacote íntegro.") }
    }
    fun import(uri: Uri) {
        if (mutable.value.busy) return
        mutable.value = mutable.value.copy(busy = true, message = "Conferindo pacote…")
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val input = getApplication<Application>().contentResolver.openInputStream(uri) ?: error("Não foi possível abrir o arquivo.")
                    store.install(input) { step -> mutable.value = mutable.value.copy(message = step) }
                }
                mutable.value = mutable.value.copy(message = "Acervo instalado. Suas notas foram preservadas.")
            } catch (failure: Exception) {
                mutable.value = mutable.value.copy(message = failure.message ?: "Falha ao instalar. O acervo anterior permanece ativo.")
            } finally { refresh() }
        }
    }
    fun dismiss() { mutable.value = mutable.value.copy(message = null) }
}
