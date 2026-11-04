package org.scriptorium.app.ui

import android.content.Intent
import androidx.core.net.toUri
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import org.json.JSONObject
import org.scriptorium.app.data.objects
import org.scriptorium.app.data.safeExternalUrl

@Composable
internal fun StudyFoundation(records: List<JSONObject>) {
    if (records.isEmpty()) return
    var expanded by remember(records.map { it.optString("claim") }) { mutableStateOf(false) }
    var selected by remember(records.map { it.optString("claim") }) { mutableIntStateOf(0) }
    val context = LocalContext.current
    var error by remember { mutableStateOf(false) }
    TextButton(onClick = { expanded = !expanded }) { Text("Fundamentação ${if (expanded) "▴" else "▾"}") }
    if (expanded) Surface(color = MaterialTheme.colorScheme.surfaceContainer, shape = MaterialTheme.shapes.medium) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (records.size > 1) records.forEachIndexed { index, record ->
                FilterChip(selected == index, { selected = index }, label = { Text(record.optString("area")) })
            }
            val record = records[selected.coerceIn(records.indices)]
            Text("${record.optString("area")} · ${record.optString("status")}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            Text(record.getString("claim"), style = MaterialTheme.typography.titleMedium)
            Text(record.getString("basis"), style = MaterialTheme.typography.bodyMedium)
            record.objects("sources").forEach { source ->
                HorizontalDivider(Modifier.padding(vertical = 6.dp))
                TextButton(onClick = {
                    val url = safeExternalUrl(source.optString("url"))
                    error = url == null || runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) }.isFailure
                }, contentPadding = PaddingValues(0.dp)) { Text("${source.getString("title")} ↗") }
                Text(source.getString("locator"), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
                Text(source.getString("supports"), style = MaterialTheme.typography.bodyMedium)
                Text("Alcance: ${source.getString("limit")}", style = MaterialTheme.typography.bodySmall)
                Text(source.getString("perspective"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("Perspectivas e limites", Modifier.padding(top = 8.dp), style = MaterialTheme.typography.titleSmall)
            Text(record.getString("alternatives"), style = MaterialTheme.typography.bodyMedium)
            if (error) Text("Não foi possível abrir a fonte.", color = MaterialTheme.colorScheme.error)
        }
    }
}
