package org.scriptorium.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*

@Composable
fun TodayScreen(repository: MobileRepository, personal: PersonalRepository, open: (Passage) -> Unit) {
    val date = java.time.LocalDate.now()
    Load(date, {
        val edition = repository.scriptureEditions().first()
        val books = repository.books(edition)
        val total = books.sumOf { it.number("chapters") }
        var index = Math.floorMod(date.toEpochDay(), total.toLong()).toInt()
        val book = books.first { row -> if (index < row.number("chapters")) true else { index -= row.number("chapters"); false } }
        val passage = Passage(edition, book.text("id"), book.text("book_id"), book.text("title"), index + 1, book.text("scheme"))
        Triple(passage, repository.verses(passage).firstOrNull(), repository.comments(passage).take(3))
    }) { (passage, verse, comments) ->
        LazyColumn(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            item { Heading("Hoje · $date", "Uma passagem para cada dia, com as fontes e o contexto disponíveis no seu acervo.") }
            item { Heading("${passage.title} ${passage.chapter}"); verse?.let { Text(it.text("surface_text"), style = MaterialTheme.typography.headlineSmall) } }
            item { Button(onClick = { open(passage) }) { Text("Abrir leitura e comentários") } }
            item { Text("${comments.size} fontes nesta prévia. Isso indica disponibilidade, não revisão ou concordância entre interpretações.", style = MaterialTheme.typography.bodySmall) }
            item { ChapterContext(repository, personal, passage) }
        }
    }
}
