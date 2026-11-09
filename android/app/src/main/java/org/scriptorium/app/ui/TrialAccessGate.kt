package org.scriptorium.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.scriptorium.app.data.TrialAccessManager
import org.scriptorium.app.data.TrialStatus

@Composable
fun TrialAccessGate(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val manager = remember(context) { TrialAccessManager(context) }
    var refresh by remember { mutableIntStateOf(0) }
    var checking by remember { mutableStateOf(true) }
    var status by remember { mutableStateOf<TrialStatus?>(null) }
    var remainingMillis by remember { mutableLongStateOf(0L) }
    var failed by remember { mutableStateOf(false) }
    var initialValidationComplete by remember { mutableStateOf(false) }
    val validationComplete by rememberUpdatedState(initialValidationComplete)

    androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_START && validationComplete) refresh++
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(refresh) {
        checking = true
        failed = false
        try {
            val result = withContext(Dispatchers.IO) { manager.validate() }
            status = result.status
            remainingMillis = result.remainingMillis
        } catch (_: Exception) {
            failed = true
            status = TrialStatus.INVALID
        } finally {
            checking = false
            initialValidationComplete = true
        }
    }

    LaunchedEffect(status, remainingMillis) {
        if (status == TrialStatus.ACTIVE && remainingMillis > 0L) {
            kotlinx.coroutines.delay(remainingMillis)
            refresh++
        }
    }

    if (checking || status == TrialStatus.ACTIVE) {
        if (checking) TrialMessage("Conferindo a licença…", "Conectando à internet para validar o prazo de acesso.", loading = true)
        else content()
    } else {
        val (title, body) = when {
            failed || status == TrialStatus.INVALID -> "Não foi possível validar" to "Tente novamente com acesso à internet. Os dados locais de ativação não foram alterados."
            status == TrialStatus.ACTIVATION_REQUIRED -> "Ative o Scriptorium" to "Conecte este celular à internet para iniciar o período de 30 dias. Depois da ativação, a leitura também funciona offline."
            status == TrialStatus.NEEDS_INTERNET -> "Ajuste a data e conecte-se" to "O relógio do celular parece ter sido alterado. Conecte-se à internet para conferir a data correta."
            else -> "Período de acesso encerrado" to "Os 30 dias de acesso desta instalação terminaram."
        }
        TrialMessage(title, body, loading = false) { refresh++ }
    }
}

@Composable
private fun TrialMessage(title: String, body: String, loading: Boolean, retry: (() -> Unit)? = null) {
    Column(
        Modifier.fillMaxSize().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (loading) CircularProgressIndicator()
        Text(title, style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(12.dp))
        Text(body, style = MaterialTheme.typography.bodyLarge)
        if (retry != null) {
            Spacer(Modifier.height(20.dp))
            Button(onClick = retry) { Text("Tentar novamente") }
        }
    }
}
