package org.scriptorium.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.scriptorium.app.data.*

@Composable
fun PrimaryReader(repository: MobileRepository, personal: PersonalRepository, work: Row, close: () -> Unit) {
    BackHandler(onBack = close)
    val appearance = LocalReadingAppearance.current
    val edition = repository.editions().first { it.id == work.text("edition_id") }
    var offset by remember { mutableIntStateOf(0) }
    var note by remember { mutableStateOf<String?>(null) }
    var translatedVolume by remember { mutableStateOf<StudyReading?>(null) }
    translatedVolume?.let { reading ->
        LibraryScreen(repository, personal, reading)
        BackHandler { translatedVolume = null }
        return
    }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = close) { Text("Voltar à biblioteca") }
        Heading(work.text("title"), repository.navigation.editionTitle(edition.id, edition.title))
        if (work.text("id") == "work:gospel-thomas-coptic") {
            Text("Esta edição é o original copta, não uma tradução portuguesa. O tradutor local não suporta copta. Os volumes abaixo são leituras alternativas do seu acervo; não há alinhamento automático entre seus parágrafos e o original.", style = MaterialTheme.typography.bodySmall)
            Load("thomas-translated-sections", repository::translatedThomasSections) { sections ->
                sections.forEach { section -> TextButton(onClick = {
                    translatedVolume = StudyReading("thomas:${section.text("id")}", section.text("source_title"), "Tradução espanhola · use a tradução local para português", page = section)
                }) { Text("Abrir Tomé em espanhol · ${section.text("source_title")} · p. ${section.number("page_index") + 1}") } }
            }
            Load("thomas-translated-volumes", { repository.documents().filter { normalizedReading(it.text("title")).let { title -> title.contains("hammadi") || title.contains("gnostic") } } }) { volumes ->
                volumes.forEach { volume -> TextButton(onClick = {
                    val page = volume + mapOf("document_id" to volume.text("id"), "source_title" to volume.text("title"), "page_index" to "0", "document_pages" to volume.text("pages"))
                    translatedVolume = StudyReading("volume:${volume.text("id")}", volume.text("title"), "Consultar volume integral", page = page)
                }) { Text("Ler ${volume.text("title")} · ${volume.text("language")}") } }
            }
        }
        Load(edition.id, { repository.editionMetadata(edition) }) { metadata ->
            Text(metadata.text("language"), style = MaterialTheme.typography.labelSmall)
            Load(work.text("id") to offset, { repository.primaryUnits(edition, work.text("id"), offset) }) { units ->
                LazyColumn(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    item { Row {
                        TextButton(enabled = offset > 0, onClick = { offset = (offset - 80).coerceAtLeast(0) }) { Text("Anterior") }
                        TextButton(enabled = offset + units.size < work.number("unit_count"), onClick = { offset += 80 }) { Text("Próximas unidades") }
                    } }
                    items(units, key = { it.text("id") }) { unit -> Column {
                        Text(unit.text("display_address"), style = MaterialTheme.typography.labelSmall)
                        Load(unit.text("id"), { repository.preparedTranslation(unit.text("id"), unit.text("surface_text")) }) { prepared ->
                            if (prepared != null) { Text("Tradução preparada no PC · ${org.json.JSONObject(prepared.text("metadata_json")).optString("review_status")}", style = MaterialTheme.typography.labelSmall); Text(prepared.text("body"), fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.55f).sp) }
                            TranslationBlock(unit.text("surface_text"), metadata.text("language"), personal)
                        }
                        SelectionContainer { Text(unit.text("surface_text"), fontFamily = appearance.fontFamily, fontSize = appearance.size.sp, lineHeight = (appearance.size * 1.55f).sp) }
                        TextButton(onClick = { note = unit.text("id") }) { Text("Anotar") }
                    } }
                    item { Text("Unidades ${offset + 1}–${offset + units.size} de ${work.number("unit_count")}") }
                }
            }
        }
    }
    note?.let { unitId -> NoteEditor(personal, null, unitId) { note = null } }
}
