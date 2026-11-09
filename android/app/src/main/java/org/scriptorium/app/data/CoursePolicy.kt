package org.scriptorium.app.data

import org.json.JSONObject

object CoursePolicy {
    fun issues(module: JSONObject, work: JSONObject): List<String> = buildList {
        val lessons = work.strings("lessons").toSet()
        val readings = work.strings("readings").toSet()
        module.objects("lessons").filter { it.getString("id") !in lessons }.forEach { add("Confirme a aula: ${it.getString("title")}") }
        module.objects("passages").filter { it.getString("id") !in readings }.forEach { add("Confirme a passagem: ${it.getString("label")}") }
        if (work.optString("response").trim().length < 80) add("Escreva uma resposta com argumento e referência (mínimo de 80 caracteres).")
        val criteria = work.optJSONArray("criteria")
        val checked = if (criteria == null) emptySet() else (0 until criteria.length()).map { criteria.getInt(it) }.toSet()
        module.getJSONObject("activity").strings("criteria").forEachIndexed { index, criterion -> if (index !in checked) add("Confira: $criterion") }
    }
}
