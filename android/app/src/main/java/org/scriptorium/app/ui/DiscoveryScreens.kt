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
    // The tree reads well on a phone; the map is an extra, only where themes are actually linked.
    var graph by rememberSaveable { mutableStateOf(false) }
    val navigation = repository.navigation
    fun name(row: Row) = navigation.topic(row.text("id"), row.text("canonical_name"))
    fun humanized(id: String) = id.substringAfter(':').replace('-', ' ').replaceFirstChar(Char::uppercase)
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Heading("Teologia", "Os temas do acervo, por tipo. Toque num tema para ver a descrição e com o que ele se liga.")
        Load("ontology", { Triple(repository.ontology(), repository.ontologyRelations(), repository.publicClaims()) }) { (entities, relations, claims) ->
            val byId = entities.associateBy { it.text("id") }
            val linked = relations.flatMap { listOf(it.text("from_entity_id"), it.text("to_entity_id")) }.filter { it in byId }.distinct()
            // "Expiação" is both a doctrine and a theme: the map and its chips say which one.
            fun mapName(row: Row) = if (entities.count { name(it) == name(row) } > 1) "${name(row)} (${ontologyKindName(row.text("ontology_kind"))})" else name(row)
            if (linked.isNotEmpty()) TextButton(onClick = { graph = !graph }) {
                Text(if (graph) "Ver a lista de temas" else "Ver as ligações entre temas (${relations.size})")
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (graph && linked.isNotEmpty()) item {
                    KnowledgeGraph(linkedLayout(linked, relations).map { (id, x, y) -> GraphNode(id, mapName(byId.getValue(id)), x, y) }, relations.map { GraphEdge(it.text("from_entity_id"), it.text("to_entity_id"), navigation.term("relations", it.text("relation_type"))) }) { id -> selected = byId[id] }
                    Text("Só os ${linked.size} temas com ligação explícita no acervo; os demais estão na lista.", style = MaterialTheme.typography.labelSmall)
                }
                if (entities.isEmpty()) item { Text("Este pacote não inclui a ontologia. Exporte também knowledge.sqlite3 no PC.") }
                if (!graph) entities.groupBy { it.text("ontology_kind") }.forEach { (kind, group) ->
                    item { Text(ontologyLabel(kind), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp)) }
                    items(group.sortedBy { name(it) }, key = { it.text("id") }) { entity ->
                        Column(Modifier.fillMaxWidth().clickable { selected = entity }.padding(horizontal = 12.dp, vertical = 10.dp)) {
                            Text(name(entity))
                            entity.text("description").takeIf(String::isNotBlank)?.let {
                                Text(it, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
                item { Heading("Proposições e argumentos", "Não são pontuações de verdade. Cada proposição mostra o tipo e o quanto já foi conferida.") }
                items(claims, key = { it.text("id") }) { row ->
                    Column(Modifier.fillMaxWidth().clickable { claim = row }.padding(horizontal = 12.dp, vertical = 8.dp)) {
                        Text(row.text("proposition"))
                        Text("${navigation.term("claimKinds", row.text("claim_type"))} · ${navigation.term("reviewStatus", row.text("review_status"))}",
                            style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
                    }
                }
            }
            selected?.let { entity -> AlertDialog(onDismissRequest = { selected = null }, title = { Text(mapName(entity)) }, confirmButton = { TextButton(onClick = { selected = null }) { Text("Fechar") } }, text = {
                Column {
                    entity.text("description").takeIf(String::isNotBlank)?.let { Text(it); TranslationBlock(it, "und", personal) }
                    Load(entity.text("id"), { repository.ontologyRelations(entity.text("id")) }) { links ->
                        if (links.isEmpty()) Text("Nenhuma ligação explícita com outros temas no acervo.", Modifier.padding(top = 16.dp))
                        links.forEach {
                            Text("${byId[it.text("from_entity_id")]?.let(::mapName) ?: it.text("from_title")} ${navigation.term("relations", it.text("relation_type"))} ${byId[it.text("to_entity_id")]?.let(::mapName) ?: it.text("to_title")}", Modifier.padding(vertical = 8.dp))
                        }
                    }
                }
            }) }
            claim?.let { row -> AlertDialog(onDismissRequest = { claim = null }, title = { Text("Proposição") }, confirmButton = { TextButton(onClick = { claim = null }) { Text("Fechar") } }, text = {
                Column(Modifier.heightIn(max = 550.dp).verticalScroll(androidx.compose.foundation.rememberScrollState())) {
                    TranslationBlock(row.text("proposition"), "und", personal)
                    Text(row.text("proposition"))
                    Text("${navigation.term("claimKinds", row.text("claim_type"))} · ${navigation.term("reviewStatus", row.text("review_status"))}", style = MaterialTheme.typography.labelSmall)
                    Load(row.text("id"), { repository.arguments(row.text("id")) }) { arguments ->
                        if (arguments.isEmpty()) Text("Nenhum argumento explícito para esta proposição.")
                        // Names instead of identifiers: the proposition, the argument title or the theme.
                        fun describe(kind: String, id: String) = when (kind) {
                            "claim" -> claims.find { it.text("id") == id }?.text("proposition")
                            "argument" -> arguments.find { it.text("id") == id }?.text("title")
                            else -> byId[id]?.let(::name)
                        } ?: humanized(id)
                        arguments.forEach { argument ->
                            Heading(argument.text("title")); Text(argument.text("conclusion"))
                            Load(argument.text("id"), { repository.argumentDetail(argument.text("id")) }) { (premises, links) ->
                                premises.forEach { Text("Premissa: ${it.text("proposition")}", Modifier.padding(top = 8.dp)) }
                                links.forEach {
                                    Text("${describe(it.text("from_kind"), it.text("from_id"))} ${navigation.term("relations", it.text("relation_type"))} ${describe(it.text("to_kind"), it.text("to_id"))}", Modifier.padding(top = 8.dp))
                                }
                            }
                        }
                    }
                }
            }) }
        }
    }
}

/**
 * Each group of linked themes on its own row, the most connected in the middle, so every line is
 * horizontal and its name sits above it, clear of the theme names below the points.
 */
internal fun linkedLayout(ids: List<String>, relations: List<Row>): List<Triple<String, Float, Float>> {
    val neighbours = ids.associateWith { id -> relations.filter { it.text("from_entity_id") == id || it.text("to_entity_id") == id }
        .map { if (it.text("from_entity_id") == id) it.text("to_entity_id") else it.text("from_entity_id") }.filter { it in ids }.toSet() }
    val groups = mutableListOf<List<String>>()
    val seen = mutableSetOf<String>()
    for (start in ids) if (seen.add(start)) {
        val group = mutableListOf(start)
        var index = 0
        while (index < group.size) neighbours.getValue(group[index++]).forEach { if (seen.add(it)) group += it }
        groups += group
    }
    return groups.flatMapIndexed { row, group ->
        val hub = group.maxBy { neighbours.getValue(it).size }
        val others = group - hub
        val ordered = others.filterIndexed { index, _ -> index % 2 == 1 } + hub + others.filterIndexed { index, _ -> index % 2 == 0 }
        val y = if (groups.size == 1) 380f else 140f + row * 480f / (groups.size - 1)
        ordered.mapIndexed { index, id -> Triple(id, if (ordered.size == 1) 540f else 140f + index * 800f / (ordered.size - 1), y) }
    }
}

private fun ontologyKindName(kind: String): String = when (kind) {
    "theological-topic" -> "tema"; "doctrine" -> "doutrina"; "tradition" -> "tradição"; "school" -> "escola"
    "method" -> "método"; "epistemic-stance" -> "postura"; "interpretive-framework" -> "sistema"; "position" -> "posição"; "theory" -> "teoria"
    else -> kind
}

private fun ontologyLabel(kind: String): String = when (kind) {
    "theological-topic" -> "Temas"; "doctrine" -> "Doutrinas"; "tradition" -> "Tradições"
    "school" -> "Escolas"; "method" -> "Métodos"; "epistemic-stance" -> "Posturas epistemológicas"
    "interpretive-framework" -> "Sistemas interpretativos"; "position" -> "Posições"; "theory" -> "Teorias"
    else -> kind
}
