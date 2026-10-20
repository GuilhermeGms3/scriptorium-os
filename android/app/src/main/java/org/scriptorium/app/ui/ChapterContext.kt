package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.json.JSONObject
import org.scriptorium.app.data.*

@Composable
fun ChapterContext(repository: MobileRepository, personal: PersonalRepository, passage: Passage, initiallyExpanded: Boolean = false) {
    var expanded by remember(passage) { mutableStateOf(initiallyExpanded) }
    var selected by remember { mutableStateOf<Row?>(null) }
    var page by remember { mutableStateOf<Row?>(null) }
    var shown by remember(passage) { mutableIntStateOf(12) }
    TextButton(onClick = { expanded = !expanded }) { Text("Contexto histórico, geografia e fontes ${if (expanded) "▴" else "▾"}") }
    if (expanded) Load(passage, { repository.comments(passage) }) { comments ->
        val contextual = comments.filter { row ->
            val analysis = JSONObject(row.text("payload_json")).optJSONObject("contextualAnalysis")
            analysis?.optString("contentType") == "historical-context" || analysis?.optJSONObject("sourceVisual") != null || analysis?.optJSONObject("sourceContext")?.optString("kind") == "biblical-handbook"
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (contextual.isEmpty()) Text("Nenhum contexto histórico ou visual identificado para este endereço no acervo atual. Os comentários permanecem disponíveis na leitura.", style = MaterialTheme.typography.bodySmall)
            contextual.take(shown).forEachIndexed { index, comment ->
                val accent = sourceAccent(comment)
                Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.small,
                    border = BorderStroke(1.dp, accent.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth().revealSection(index).clickable(onClickLabel = "Abrir contexto da fonte") { selected = comment }) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(comment.text("source_title"), style = MaterialTheme.typography.labelMedium, color = accent)
                Text(comment.text("title"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                val visual = JSONObject(comment.text("payload_json")).optJSONObject("contextualAnalysis")?.optJSONObject("sourceVisual")
                if (visual != null) {
                    Text(visual.getString("caption"), style = MaterialTheme.typography.titleSmall)
                    Load(comment.text("id") to visual.getInt("physicalPage"), { repository.page(comment.text("document_id"), visual.getInt("physicalPage") - 1) }) { evidence ->
                        if (evidence != null) {
                            PdfPagePreview(repository, evidence, height = 200.dp)
                            TextButton(onClick = { page = evidence }) { Text("Ampliar imagem e abrir página ${visual.getInt("physicalPage")}") }
                        }
                    }
                }
                Text(comment.commentCategories().joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = accent)
                }
                }
            }
            if (contextual.size > shown) TextButton(onClick = { shown += 12 }) { Text("Mais contextos · ${contextual.size - shown}") }
        }
    }
    selected?.let { SourceDialog(repository, personal, it) { selected = null } }
    page?.let { PageDialog(repository, it, personal, startWithPdf = true) { page = null } }
}
