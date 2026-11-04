package org.scriptorium.app.ui

import java.text.Normalizer
import java.util.Locale

/** Display only. Original bibliographic titles, source IDs and citations are never rewritten. */
internal fun libraryBookTitle(original: String): String {
    val locale = Locale.forLanguageTag("pt-BR")
    val key = Normalizer.normalize(original.lowercase(locale), Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "").replace(Regex("[^a-z0-9]"), "")
    val volume = Regex("(?i)\\bvol(?:ume)?\\.?\\s*(\\d+|[ivxlcdm]+)\\b").find(original)
        ?.groupValues?.get(1)?.let { it.toIntOrNull()?.toString() ?: it.uppercase(locale) }
    fun withVolume(title: String) = title + (volume?.let { " · vol. $it" } ?: "")
    when {
        "doutrinacrist" in key -> return "A doutrina cristã"
        key.startsWith("anchorbibledictionary") -> return "Anchor Bible Dictionary"
        key.startsWith("bibliasagradamultiversoes") -> return "Bíblia multiversões"
        "traducaoecumenica" in key -> return "Bíblia TEB"
        "biblialiteraldotextotradicional" in key -> return "Bíblia LTT"
        key == "ntnvi" -> return "Bíblia NVI · NT"
        key == "atnvipt" -> return "Bíblia NVI · AT"
        key.startsWith("acf2007") -> return "Bíblia ACF 2007"
        "biblia" in key && "avemaria" in key -> return "Bíblia Ave-Maria"
        key.startsWith("novodicionariointernacionaldeteologia") && "antigotestamento" in key -> return withVolume("NDITAT")
        key.startsWith("dicionariointernacionaldeteologia") && "antigotestamento" in key -> return "DITAT"
        key.startsWith("teologiasistematica") && "trecho" in key -> return "Teologia sistemática · trecho"
        key.startsWith("teologiadonovotestamento") && "ladd" in key -> return "Teologia do NT · Ladd"
        key.startsWith("teologiaatvonrad") -> return "Teologia do AT · von Rad"
        key.startsWith("exegesedonovotestamentomanual") && "wegner" in key -> return "Exegese do NT · Wegner"
        key.startsWith("craigskeener") -> return "Contexto cultural do NT · Keener"
        key.startsWith("comentariodousodoantigo") -> return "Uso do AT no NT · Beale"
        key.startsWith("vladimirlossky") -> return "Teologia mística · Lossky"
        key.startsWith("bispokallistosware") -> return "A Igreja Ortodoxa · Ware"
        key.startsWith("ossalmoscomentados") -> {
            val number = Regex("(\\d+)\\s*$").find(original)?.groupValues?.get(1)?.toIntOrNull()
            return "Salmos comentados" + (number?.let { " · vol. $it" } ?: "")
        }
        "naghammadi" in key -> {
            val part = Regex("(?i)nag\\s+hammadi\\s+([ivx]+|\\d+)\\b").find(original)?.groupValues?.get(1)
            return "Nag Hammadi" + (part?.let { " · vol. ${it.uppercase(locale)}" } ?: "")
        }
        key.startsWith("theworksofflaviusjosephus") -> return "Obras de Flávio Josefo"
    }
    val clean = original.replace(Regex("(?i)\\.(pdf|epub|tiff?)$"), "")
        .replace('_', ' ').removePrefix("Patrística - ")
        .replace(Regex("\\s+"), " ").trim()
    if (clean.isBlank()) return "Sem título"
    var title = clean.lowercase(locale).replaceFirstChar { it.titlecase(locale) }
    val spellings = mapOf("biblia" to "Bíblia", "biblico" to "bíblico", "biblica" to "bíblica",
        "sistematica" to "sistemática", "teologica" to "teológica", "lexico" to "léxico",
        "dicionario" to "dicionário", "patristica" to "patrística")
    for ((word, corrected) in spellings) title = title.replace(Regex("(?i)\\b$word\\b"), corrected)
    title = title.replaceFirstChar { it.titlecase(locale) }
    val names = listOf("Nag Hammadi", "São João", "Tomás de Aquino", "Santo Agostinho", "MacArthur",
        "Agostinho", "Genebra", "Shedd", "Jerusalém", "Wesley", "Randall Price", "Keener", "Oxford",
        "Calvino", "Kallistos Ware", "Lossky", "Beale", "Wegner", "João", "Gênesis", "Westminster",
        "Augsburgo", "Deus", "Jesus", "Cristo", "Policarpo", "Clemente", "Orígenes", "Crisóstomo",
        "Coríntios", "Filipenses", "Efésios", "Gálatas", "Tomé", "Mateus", "Marcos", "Lucas",
        "Calcedônia", "AT", "NT", "NVI", "ACF", "TEB", "LTT", "DITAT", "NDITAT", "AA.VV")
    for (name in names) title = title.replace(Regex("(?i)(?<!\\p{L})${Regex.escape(name)}(?!\\p{L})"), name)
    return title
}
