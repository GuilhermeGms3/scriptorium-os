package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.data.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun TodayScreen(repository: MobileRepository, open: (Passage) -> Unit, openGuide: (String) -> Unit) {
    val date = LocalDate.now()
    val context = LocalContext.current
    val preferences = remember { ReadingPreferences(context) }
    Load(date, {
        val editions = repository.scriptureEditions()
        val edition = editions.firstOrNull() ?: error("Instale uma edição de Escrituras para a leitura do dia.")
        val (book, chapter) = dailyChapter(date, repository.books(edition)) ?: error("Esta edição não contém capítulos.")
        val base = Passage(edition, book.text("id"), book.text("book_id"), book.text("title"), chapter, book.text("scheme"))
        val verses = repository.verses(base)
        val verse = verses.getOrNull(Math.floorMod(date.toEpochDay(), verses.size.coerceAtLeast(1).toLong()).toInt())
        val daily = base.copy(verse = verse?.number("verse_start"))
        val guides = repository.catalog("guide")
        val guide = guides.getOrNull(Math.floorMod(date.toEpochDay(), guides.size.coerceAtLeast(1).toLong()).toInt())
        val guideContent = guide?.let { repository.catalogItem(it.text("id")) }
        DailyReading(decodePassage(preferences.lastPassage(), editions), daily, verse, guide, guideContent)
    }) { today ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            item { Heading("Seu scriptorium", date.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", Locale.forLanguageTag("pt-BR")))) }
            today.last?.let { last -> item {
                Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = MaterialTheme.shapes.medium) {
                    Column(Modifier.padding(20.dp)) {
                        Text("CONTINUAR DE ONDE PAREI", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        Heading("${last.title} ${last.chapter}${last.verse?.let { ":$it" }.orEmpty()}")
                        Text(last.edition.title, style = MaterialTheme.typography.bodySmall)
                        Button(onClick = { open(last) }, modifier = Modifier.padding(top = 12.dp)) { Text("Retomar leitura") }
                    }
                }
            } }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("UMA PASSAGEM PARA HOJE", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall)
                    Text("${today.passage.title} ${today.passage.chapter}${today.passage.verse?.let { ":$it" }.orEmpty()}", style = MaterialTheme.typography.titleLarge)
                    today.verse?.let { Text(it.text("surface_text"), fontFamily = FontFamily.Serif, fontSize = 23.sp, lineHeight = 35.sp) }
                    OutlinedButton(onClick = { open(today.passage) }) { Text("Ler no contexto") }
                    Text("Seleção diária do texto instalado, com rotação por data. Não é uma previsão nem um calendário litúrgico.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                }
            }
            today.guide?.let { guide -> item {
                HorizontalDivider()
                Heading("Trilha do dia", guide.text("title"))
                today.content?.objects("modules")?.firstOrNull()?.let { module ->
                    Text(module.optString("title"), style = MaterialTheme.typography.titleMedium)
                    Text(module.optString("explanation"), Modifier.padding(vertical = 12.dp), style = MaterialTheme.typography.bodyMedium)
                    module.strings("questions").firstOrNull()?.let { Text(it, fontFamily = FontFamily.Serif, color = MaterialTheme.colorScheme.primary, fontSize = 19.sp) }
                }
                Text("Ler → observar as fontes → registrar sua resposta", Modifier.padding(vertical = 12.dp), style = MaterialTheme.typography.labelLarge)
                Button(onClick = { openGuide(guide.text("id").removePrefix("guide:")) }) { Text("Abrir trilha de estudo") }
                Text("Tema selecionado entre os guias disponíveis no acervo. O progresso dos cursos continua em Estudos.", Modifier.padding(top = 8.dp), style = MaterialTheme.typography.labelSmall)
            } }
        }
    }
}

private data class DailyReading(val last: Passage?, val passage: Passage, val verse: Row?, val guide: Row?, val content: org.json.JSONObject?)
