package org.scriptorium.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.scriptorium.app.data.*
import kotlinx.coroutines.launch

@Composable
fun SearchScreen(repository: MobileRepository, personal: PersonalRepository, open: (Passage) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var submitted by rememberSaveable { mutableStateOf("") }
    val editions = remember { repository.scriptureEditions() }
    val edition = editions.firstOrNull { it.id.contains("biblia-livre") } ?: editions.firstOrNull()
    if (edition == null) { Text("Instale uma edição das Escrituras para pesquisar."); return }
    var selected by remember { mutableStateOf<Row?>(null) }
    var branch by rememberSaveable { mutableStateOf("Escrituras") }
    var sense by rememberSaveable { mutableStateOf(false) }
    var language by rememberSaveable { mutableStateOf("all") }
    var openOnly by rememberSaveable { mutableStateOf(false) }
    var page by rememberSaveable { mutableIntStateOf(1) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val keyboard = androidx.compose.ui.platform.LocalSoftwareKeyboardController.current
    var feedback by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text("Busca no acervo", style = MaterialTheme.typography.headlineSmall, fontFamily = androidx.compose.ui.text.font.FontFamily.Serif)
        Text("Encontre passagens e fontes.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
        Text("O que deseja encontrar?", Modifier.fillMaxWidth().padding(top = 6.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center, style = MaterialTheme.typography.labelLarge)
        // The keyboard search key searches too, without finding the button below the options.
        OutlinedTextField(query, { query = it.take(240) }, placeholder = { Text("Jo 3:16, perdão, Agostinho…") }, modifier = Modifier.fillMaxWidth(), shape = androidx.compose.foundation.shape.RoundedCornerShape(18.dp), singleLine = true,
            textStyle = LocalTextStyle.current.copy(textAlign = androidx.compose.ui.text.style.TextAlign.Center),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Search),
            keyboardActions = androidx.compose.foundation.text.KeyboardActions(onSearch = { if (query.trim().length >= 2) { submitted = query.trim(); page = 1; keyboard?.hide() } }))
        androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(listOf("Escrituras", "Biblioteca", "Exegese", "Hermenêutica", "Pesquisa acadêmica", "Na web")) { name -> FilterChip(branch == name, { branch = name; submitted = "" }, label = { Text(name) }) }
        }
        if (branch == "Exegese" || branch == "Hermenêutica") Text("Páginas com associações classificadas no acervo.", style = MaterialTheme.typography.labelSmall)
        Box(Modifier.fillMaxWidth(), contentAlignment = androidx.compose.ui.Alignment.Center) {
            if (branch == "Escrituras") FilterChip(sense, { sense = !sense }, label = { Text("Por sentido", style = MaterialTheme.typography.labelMedium) }, modifier = Modifier.align(androidx.compose.ui.Alignment.CenterStart))
            Button(onClick = { submitted = query.trim(); page = 1; keyboard?.hide() }, enabled = query.trim().length >= 2, contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp)) { Text("Pesquisar") }
        }
        if (branch == "Escrituras" && sense) Text("Busca por proximidade de significado, não por frase exata.", style = MaterialTheme.typography.labelSmall)
        if (branch == "Pesquisa acadêmica") {
            Row {
                listOf("all" to "Todos", "pt" to "PT", "en" to "EN", "es" to "ES").forEach { (id, label) -> FilterChip(language == id, { language = id }, label = { Text(label) }) }
            }
            Row { Checkbox(openOnly, { openOnly = it }); Text("Apenas acesso aberto", Modifier.padding(top = 12.dp)) }
            Text("Somente a consulta digitada é enviada ao OpenAlex após Pesquisar. Seus livros e notas não são enviados.", style = MaterialTheme.typography.labelSmall)
        }
        feedback?.let { Text(it) }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (submitted.isNotBlank() && branch == "Na web") LazyColumn(Modifier.fillMaxSize()) {
                item { Text("Atalhos externos, não resultados importados nem fontes verificadas pelo Scriptorium.") }
                items(ExternalResearch.links(submitted)) { (name, url) -> TextButton(onClick = {
                    safeExternalUrl(url)?.let { context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(it))) }
                }) { Text("├─ $name") } }
            }
            if (submitted.isNotBlank() && branch == "Pesquisa acadêmica") Load(listOf(submitted, language, openOnly, page), { ExternalResearch.academic(submitted, language, openOnly, page) }) { works -> LazyColumn {
                items(works, key = { it.text("id") }) { work -> Column(Modifier.padding(vertical = 10.dp)) {
                    Text(work.text("title"), style = MaterialTheme.typography.titleMedium)
                    Text("${work.text("year")} · ${work.text("authors")}", style = MaterialTheme.typography.bodySmall)
                    Row {
                        TextButton(onClick = { safeExternalUrl(work.text("url"))?.let { context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(it))) } }) { Text("Abrir fonte") }
                        TextButton(onClick = { scope.launch {
                            try { kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { personal.saveReference(work.text("id"), work.text("title"), work.text("payload_json")) }; feedback = "Referência guardada na Biblioteca." }
                            catch (failure: Exception) { feedback = failure.message }
                        } }) { Text("Guardar referência") }
                    }
                } }
                item { Row {
                    TextButton(enabled = page > 1, onClick = { page-- }) { Text("Anterior") }
                    Text("$page", Modifier.padding(12.dp))
                    TextButton(enabled = works.size == 10 && page < 10, onClick = { page++ }) { Text("Próxima") }
                } }
            } }
            if (submitted.isNotBlank() && branch in listOf("Escrituras", "Biblioteca", "Exegese", "Hermenêutica")) Load(listOf(submitted, edition, sense, branch), {
                val reference = if (branch == "Escrituras") repository.resolveReference(submitted, edition) else null
                if (reference != null) listOf(SearchHit("${reference.title} ${reference.chapter}${reference.verse?.let { ":$it" }.orEmpty()}${reference.verseEnd?.let { "–$it" }.orEmpty()}", "Abrir diretamente no texto", passage = reference))
                else if (sense && branch == "Escrituras") repository.semanticSearch(submitted, edition) else repository.search(submitted, edition, when (branch) {
                    "Biblioteca" -> LocalSearchScope.LIBRARY
                    "Exegese" -> LocalSearchScope.EXEGESIS
                    "Hermenêutica" -> LocalSearchScope.HERMENEUTICS
                    else -> LocalSearchScope.SCRIPTURE
                })
            }) { results ->
                LazyColumn {
                    item { Text("${results.size} resultados · até 40 por consulta", style = MaterialTheme.typography.labelSmall) }
                    if (results.isEmpty()) item { Text("Nenhum resultado neste pacote.", Modifier.padding(16.dp)) }
                    items(results) { result ->
                        ListItem(headlineContent = { Text(result.title) }, supportingContent = { Text(result.text) }, modifier = Modifier.clickable {
                            result.passage?.let(open)
                            result.page?.let { selected = it }
                        })
                    }
                }
            }
        }
    }
    selected?.let { PageDialog(repository, it, personal) { selected = null } }
}

@Composable
fun KnowledgeScreen(repository: MobileRepository, personal: PersonalRepository) {
    var selected by remember { mutableStateOf<Row?>(null) }
    var claim by remember { mutableStateOf<Row?>(null) }
    var graph by rememberSaveable { mutableStateOf(true) }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("Teologia", "Árvore do acervo instalado. Doutrina, tradição, método e posição permanecem categorias distintas.")
        TextButton(onClick = { graph = !graph }) { Text(if (graph) "Mostrar lista de entidades" else "Mostrar mapa conectado") }
        Load("ontology", { repository.ontology() to repository.publicClaims() }) { (entities, claims) ->
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (graph && entities.isNotEmpty()) item {
                    Load("ontology-edges", { entities.flatMap { repository.ontologyRelations(it.text("id")) }.distinctBy { it.text("id") } }) { relations ->
                        KnowledgeGraph(entities.mapIndexed { index, row ->
                            val angle = index * 2 * Math.PI / entities.size
                            GraphNode(row.text("id"), row.text("canonical_name"), (540 + kotlin.math.cos(angle) * 400).toFloat(), (380 + kotlin.math.sin(angle) * 280).toFloat())
                        }, relations.map { GraphEdge(it.text("from_entity_id"), it.text("to_entity_id")) }) { id -> selected = entities.find { it.text("id") == id } }
                    }
                }
                if (entities.isEmpty()) item { Text("Este pacote não inclui a ontologia. Exporte também knowledge.sqlite3 no PC.") }
                entities.groupBy { it.text("ontology_kind") }.forEach { (kind, group) ->
                    item { Text("│  ${ontologyLabel(kind)}", color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 16.dp)) }
                    items(group, key = { it.text("id") }) { entity ->
                        Row(Modifier.fillMaxWidth().clickable { selected = entity }.padding(12.dp)) {
                            Text("├─  ", color = MaterialTheme.colorScheme.primary)
                            Column { Text(entity.text("canonical_name")); Text(entity.text("description"), style = MaterialTheme.typography.bodySmall) }
                        }
                    }
                }
                item { Heading("Proposições e argumentos", "Não são pontuações de verdade. Cada proposição preserva seu tipo e revisão.") }
                items(claims, key = { it.text("id") }) { row -> TextButton(onClick = { claim = row }) { Text(row.text("proposition")) } }
            }
        }
    }
    selected?.let { entity -> AlertDialog(onDismissRequest = { selected = null }, title = { Text(entity.text("canonical_name")) }, confirmButton = { TextButton(onClick = { selected = null }) { Text("Fechar") } }, text = {
        Column {
            Text(entity.text("description"))
            TranslationBlock(entity.text("description"), "und", personal)
            Load(entity.text("id"), { repository.ontologyRelations(entity.text("id")) }) { relations ->
                if (relations.isEmpty()) Text("Sem relações explícitas exportadas para esta entidade.", Modifier.padding(top = 16.dp))
                relations.forEach { Text("${it.text("from_title")} → ${it.text("relation_type")} → ${it.text("to_title")}", Modifier.padding(vertical = 8.dp)) }
            }
        }
    }) }
    claim?.let { row -> AlertDialog(onDismissRequest = { claim = null }, title = { Text("Proposição") }, confirmButton = { TextButton(onClick = { claim = null }) { Text("Fechar") } }, text = {
        Column(Modifier.heightIn(max = 550.dp).verticalScroll(androidx.compose.foundation.rememberScrollState())) {
            TranslationBlock(row.text("proposition"), "und", personal)
            Text(row.text("proposition")); Text("${row.text("claim_type")} · ${row.text("review_status")}", style = MaterialTheme.typography.labelSmall)
            Load(row.text("id"), { repository.arguments(row.text("id")) }) { arguments ->
                if (arguments.isEmpty()) Text("Nenhum argumento explícito para esta proposição.")
                arguments.forEach { argument ->
                    Heading(argument.text("title")); Text(argument.text("conclusion"))
                    Load(argument.text("id"), { repository.argumentDetail(argument.text("id")) }) { (premises, relations) ->
                        premises.forEach { Text("Premissa: ${it.text("proposition")}", Modifier.padding(top = 8.dp)) }
                        relations.forEach { Text("${it.text("relation_type")}: ${it.text("from_id")} → ${it.text("to_id")}", Modifier.padding(top = 8.dp)) }
                    }
                }
            }
        }
    }) }
}

private fun ontologyLabel(kind: String): String = when (kind) {
    "theological-topic" -> "Temas"; "doctrine" -> "Doutrinas"; "tradition" -> "Tradições"
    "school" -> "Escolas"; "method" -> "Métodos"; "epistemic-stance" -> "Posturas epistemológicas"
    "interpretive-framework" -> "Sistemas interpretativos"; "position" -> "Posições"; "theory" -> "Teorias"
    else -> kind
}
