# Identidade textual

Uma referência humana não é uma chave universal. `TextUnit.id` identifica de forma estável uma unidade concreta em corpus, edição e obra; `PassageAddress` descreve como essa unidade é localizada em um esquema de referência.

IDs importados são determinísticos a partir de corpus, edição, obra e sequência auditada. Slugs e texto visível não são chaves primárias. `TextAnchor` distingue âncoras semânticas de obra (`passage`) de âncoras específicas de edição (`text-unit` e `text-range`) e pode carregar offsets internos.

O modelo também aceita seção, parágrafo, dito, fragmento, página, coluna e linha. Assim, uma futura unidade como `NHC II / Gospel of Thomas / Saying 1` não precisa fingir que é um versículo. Folio, coluna e linha podem ser adicionados sem mudar a identidade fundamental.

`textAnchorKey` inclui obra, corpus, edição, esquema, unidades, range e offsets aplicáveis. A compatibilidade antiga existe apenas em `legacyPassageRefToAnchor` e está marcada como obsoleta.

Veja também [ADR 0001](../adr/0001-text-identity-is-not-verse-numbering.md).
