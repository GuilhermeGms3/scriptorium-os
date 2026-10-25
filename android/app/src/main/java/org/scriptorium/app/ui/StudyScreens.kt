package org.scriptorium.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun StudyScreen(repository: MobileRepository, personal: PersonalRepository, requestedGuide: String? = null, openPassage: (Passage) -> Unit, openLibrary: (StudyReading?) -> Unit = {}) {
    var guide by rememberSaveable(requestedGuide) { mutableStateOf(requestedGuide) }
    var course by rememberSaveable { mutableStateOf<String?>(null) }
    var lessonId by rememberSaveable { mutableStateOf<String?>(null) }
    var homeVersion by remember { mutableIntStateOf(0) }
    var courseModule by rememberSaveable { mutableIntStateOf(-1) }
    fun returnHome() { guide = null; course = null; lessonId = null; homeVersion++ }
    BackHandler(lessonId != null || course != null || guide != null) { returnHome() }
    Load(homeVersion, { loadStudyHome(repository, personal) }) { state ->
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            val currentCourse = course
            val currentGuide = guide
            when {
                lessonId != null -> {
                    TextButton(onClick = ::returnHome) { Text("Voltar às aulas") }
                    Load(lessonId, { repository.catalogItem(requireNotNull(lessonId)) }) { lesson ->
                        if (lesson != null) LessonSequence(requireNotNull(lessonId).removePrefix("lesson:"), lesson, repository, personal, openLibrary, openPassage)
                    }
                }
                currentCourse != null -> Load(currentCourse, { repository.catalogItem(currentCourse) }) { json ->
                    if (json != null) CourseScreen(json, repository, personal, openPassage, openLibrary, initialModule = courseModule, close = ::returnHome)
                    else { Text("Percurso não disponível neste acervo."); TextButton(onClick = ::returnHome) { Text("Voltar à árvore") } }
                }
                currentGuide != null && !state.guideUnlocked(currentGuide) -> {
                    Heading("Um passo antes deste conceito", "Conclua o percurso anterior na árvore para liberar este guia.")
                    state.discovery?.let { discovery -> Button(onClick = { guide = null; courseModule = -1; course = discovery.getString("id") }) { Text("Continuar minha descoberta") } }
                    TextButton(onClick = ::returnHome) { Text("Voltar à árvore") }
                }
                currentGuide != null -> {
                    TextButton(onClick = ::returnHome) { Text("Voltar à árvore") }
                    Load(currentGuide, { repository.catalogItem("guide:$currentGuide") to repository.catalogItem("lesson:study-guide:$currentGuide") }) { (json, lesson) ->
                        if (json != null) GuideScreen(json, lesson, repository, personal, openPassage, openLibrary)
                        else Text("Guia não disponível neste acervo.")
                    }
                }
                else -> StudyHome(state, repository, { guide = it }, { id, index -> courseModule = index; course = id }, { lessonId = it })
            }
        }
    }
}

@Composable
fun PassageButton(repository: MobileRepository, book: String, chapter: Int, label: String, verseStart: Int? = null, verseEnd: Int? = null, open: (Passage) -> Unit) {
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    TextButton(enabled = !loading, onClick = { loading = true; error = null; scope.launch {
      try {
        val passage = withContext(Dispatchers.IO) {
            repository.readingBooks().firstOrNull { it.row.text("book_id") == book && it.row.number("chapters") >= chapter }?.let { entry ->
                Passage(entry.edition, entry.row.text("id"), book, entry.row.text("title"), chapter, entry.row.text("scheme"), verseStart, verseEnd)
            }
        }
        if (passage != null) open(passage) else error = "Passagem não disponível nas edições instaladas."
      } catch (cancelled: CancellationException) { throw cancelled }
        catch (failure: Exception) { error = "Não foi possível abrir a passagem. Tente novamente." }
        finally { loading = false }
    } }) { Text(if (loading) "Abrindo $label…" else label) }
    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
}
