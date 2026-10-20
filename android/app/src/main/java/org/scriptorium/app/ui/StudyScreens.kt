package org.scriptorium.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun StudyScreen(repository: MobileRepository, personal: PersonalRepository, requestedGuide: String? = null, openPassage: (Passage) -> Unit, openLibrary: (StudyReading?) -> Unit = {}) {
    var guide by rememberSaveable(requestedGuide) { mutableStateOf(requestedGuide) }
    var course by rememberSaveable { mutableStateOf<String?>(null) }
    var lessonId by rememberSaveable { mutableStateOf<String?>(null) }
    var lessonsOpen by rememberSaveable { mutableStateOf(false) }
    val currentGuide = guide
    val currentCourse = course
    BackHandler(lessonId != null || course != null || guide != null || lessonsOpen) {
        when { lessonId != null -> lessonId = null; course != null -> course = null; guide != null -> guide = null; else -> lessonsOpen = false }
    }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        if (lessonId != null) {
            TextButton(onClick = { lessonId = null }) { Text("Voltar às aulas") }
            Load(lessonId, { repository.catalogItem(requireNotNull(lessonId)) }) { lesson ->
                if (lesson != null) LessonSequence(requireNotNull(lessonId).removePrefix("lesson:"), lesson, repository, personal, openLibrary)
            }
        } else if (currentCourse != null) {
            Load(currentCourse, { repository.catalogItem(currentCourse) }) { json -> if (json != null) CourseScreen(json, repository, personal, openPassage) { course = null } }
        } else if (currentGuide != null) {
            TextButton(onClick = { guide = null }) { Text("Voltar à árvore") }
            Load(currentGuide, { repository.catalogItem("guide:$currentGuide") to repository.catalogItem("lesson:study-guide:$currentGuide") }) { (json, lesson) ->
                if (json != null) GuideScreen(json, lesson, repository, personal, openPassage, openLibrary)
            }
        } else Load("study-map", { repository.catalogItem("study-map") to listOf(repository.catalog("guide"), repository.catalog("course"), repository.catalog("lesson")) }) { (map, catalogs) ->
            val guides = catalogs[0]; val courses = catalogs[1]; val lessons = catalogs[2]
            LazyColumn {
                item { Heading("Teologia", "Os mesmos guias e aulas do desktop, com progresso pessoal neste aparelho.") }
                if (map != null) item {
                    val nodes = map.objects("nodes")
                    KnowledgeGraph(nodes.map { GraphNode(it.getString("id"), it.getString("shortTitle"), it.getDouble("x").toFloat(), it.getDouble("y").toFloat()) },
                        map.objects("edges").map { GraphEdge(it.getString("from"), it.getString("to")) }) { id -> guide = nodes.first { it.getString("id") == id }.getString("guideId") }
                }
                item { Heading("Percursos acadêmicos") }
                items(courses, key = { it.text("id") }) { row -> TextButton(onClick = { course = row.text("id") }, modifier = Modifier.fillMaxWidth()) { Text(row.text("title")) } }
                item { Heading("Guias de estudo") }
                item { androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(guides, key = { it.text("id") }) { row -> OutlinedButton(onClick = { guide = row.text("id").removePrefix("guide:") }, modifier = Modifier.width(220.dp).heightIn(min = 72.dp)) { Text(row.text("title"), color = MaterialTheme.colorScheme.secondary) } }
                } }
                item { TextButton(onClick = { lessonsOpen = !lessonsOpen }) { Text("Aulas temáticas · ${lessons.size} ${if (lessonsOpen) "▴" else "▾"}") } }
                if (lessonsOpen) item { ThematicLessons(lessons, repository) { lessonId = it } }

            }
        }
    }
}

@Composable
fun PassageButton(repository: MobileRepository, book: String, chapter: Int, label: String, open: (Passage) -> Unit) {
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    TextButton(onClick = { scope.launch {
        val passage = withContext(Dispatchers.IO) {
            repository.editions().firstNotNullOfOrNull { edition ->
                repository.books(edition).find { it.text("book_id") == book && it.number("chapters") >= chapter }?.let { row -> Passage(edition, row.text("id"), book, row.text("title"), chapter, row.text("scheme")) }
            }
        }
        if (passage != null) open(passage) else error = "Passagem não disponível nas edições instaladas."
    } }) { Text(label) }
    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
}
