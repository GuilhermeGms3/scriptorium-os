# Ontologia teológica

O modelo diferencia `TheologicalTopic`, `Doctrine`, `Tradition`, `School`, `Method`, `EpistemicStance`, `InterpretiveFramework`, `Position` e `Theory`. Essas entidades compartilham apenas metadados comuns; seus tipos não são intercambiáveis.

Relações tipadas representam, por exemplo, doutrina pertencente a tópico, posição tratando uma doutrina e teoria competindo com outra. Relações históricas podem apontar para fontes e usar `HistoricalDate`/`HistoricalRange`, que suportam ano, aproximação, século, antes, depois, intervalo e desconhecido sem forçar `Date` JavaScript.

Nomes canônicos, aliases, rótulos localizados e abreviações são pesquisáveis. Afirmações confessionais não são hardcoded como verdade: sua atribuição exige relação e proveniência.

Veja também [ADR 0004](../adr/0004-multidimensional-theology-ontology.md).
