package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.json.JSONObject
import org.scriptorium.app.data.MobileRepository
import org.scriptorium.app.data.Passage
import org.scriptorium.app.data.strings
import org.scriptorium.app.data.objects

/** Same chapter/completion identity, one extended reading context visible at a time. */
@Composable
internal fun StudyChapter(chapter: JSONObject?, repository: MobileRepository, openPassage: (Passage) -> Unit) {
    if (chapter == null) return
    StudyParagraphs(chapter.strings("paragraphs"))
    chapter.optJSONObject("deepening")?.let { deeper ->
        var selected by rememberSaveable(chapter.optString("id")) { mutableIntStateOf(0) }
        val blocks = listOf("Análise" to "analysis", "Caso de leitura" to "caseStudy", "Minha síntese" to "reflection")
        Text("APROFUNDAR ESTE CONTEÚDO", Modifier.padding(top = 12.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(vertical = 10.dp)) {
            items(blocks.size) { index -> FilterChip(selected == index, { selected = index }, label = { Text(blocks[index].first) }) }
        }
        Surface(modifier = Modifier.studyPointMotion("${chapter.optString("id")}:$selected", selected), color = if (selected == 1) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh, shape = MaterialTheme.shapes.medium) {
            Column(Modifier.padding(18.dp)) {
                Text(blocks[selected].first, Modifier.padding(bottom = 12.dp), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary)
                StudyParagraphs(listOf(deeper.optString(blocks[selected].second)))
            }
        }
        if (selected == 1) chapter.objects("passages").forEach { passage ->
            val ref = passage.getJSONObject("ref")
            PassageButton(repository, ref.getString("bookId"), ref.getInt("chapter"), passage.getString("label"), ref.optInt("verseStart").takeIf { it > 0 }, ref.optInt("verseEnd").takeIf { it > 0 }, openPassage)
        }
    }
    if (chapter.objects("foundation").isNotEmpty()) StudyFoundation(chapter.objects("foundation"))
    else StudyReferences(repository.navigation.lessonReferences().filter { it.optString("id") in chapter.strings("references") })
}
