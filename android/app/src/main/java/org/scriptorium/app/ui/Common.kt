package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun Heading(title: String, description: String? = null) {
    Column(Modifier.fillMaxWidth().padding(vertical = 12.dp).revealSection()) {
        Text(title, style = MaterialTheme.typography.headlineMedium, fontFamily = FontFamily.Serif)
        if (description != null) Text(description, style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
fun <T> Load(key: Any?, load: () -> T, content: @Composable (T) -> Unit) {
    val currentLoad by rememberUpdatedState(load)
    var retry by remember { mutableIntStateOf(0) }
    val result by produceState<Result<T>?>(null, key, retry) {
        value = null
        value = try { Result.success(withContext(Dispatchers.IO) { currentLoad() }) }
        catch (cancelled: CancellationException) { throw cancelled }
        catch (failure: Exception) { Result.failure(failure) }
    }
    val ready = result
    if (ready == null) LinearProgressIndicator(Modifier.fillMaxWidth())
    else ready.fold(onSuccess = { content(it) }, onFailure = {
        Column(Modifier.padding(16.dp)) {
            Text("Não foi possível abrir este conteúdo. ${it.message.orEmpty()}")
            TextButton(onClick = { retry++ }) { Text("Tentar novamente") }
        }
    })
}
