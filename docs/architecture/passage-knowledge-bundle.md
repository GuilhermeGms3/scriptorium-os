# Passage Knowledge Bundle — Fase 7

O `ScriptureKnowledgeEngine` é a fronteira oficial para experiências centradas em uma
passagem. A interface fornece uma referência estruturada e recebe uma composição; ela não
precisa conhecer shards, manifests, buckets lexicais ou fixtures.

```text
Route -> PassageRef -> ScriptureKnowledgeEngine -> PassageKnowledgeBundle -> UI
```

## Contratos

- `loadPassageKnowledgeBundle` carrega os shards textuais e linguísticos necessários antes de
  compor o resultado. Também aceita `book` por id, nome ou abreviação, sem regras específicas
  para João.
- `getPassageKnowledgeBundle` compõe dados já carregados e inclui texto por edição, ocorrências,
  anotações, identidades lexicais lazy, conhecimento, evidência, fontes e dados do usuário.
- `getWordKnowledgeBundle` liga uma ocorrência concreta à anotação TAGNT, ao lexema, à
  morfologia, à concordância paginada e à cadeia de fonte.
- `primePassageKnowledgeBundle` reconstitui o cache após serialização do loader, preservando SSR
  e hidratação.

`TokenOccurrence` e `Lexeme` continuam identidades distintas. A concordância é consultada pelo
id do lexema em buckets lazy; ela não percorre todos os tokens em memória.

## Disponibilidade e origem

Os estados centrais são `available`, `unavailable`, `ambiguous`, `restricted` e `demo`. Estados
legados mais específicos continuam aceitos para compatibilidade (`not-imported`, `not-analyzed`,
etc.). Somente `available` e `demo` carregam dados. Conteúdo do corpus nunca recebe `demo`;
entidades, relações, claims e lentes vindas das fixtures permanecem explicitamente
demonstrativas.

Cada camada textual possui `editionId`, idioma, texto, `sourceId`, disponibilidade e
proveniência. O motor resolve o `sourceId` no `CorpusRegistry` e cria um fragmento apontando para
o artifact concreto. A referência da fonte inclui licença do package. Para TAGNT, o fragmento
também conserva o artifact e a linha do registro.

## Separação epistemológica

- Corpus: texto, tokens e provenance de Bíblia Livre/SBLGNT.
- Linguística: alinhamento, anotação, lexema, morfologia e concordância TAGNT.
- Knowledge: entidades, relações, claims, evidência e perspectivas, com origem explícita.
- User: notas e vínculos de estudos locais; nunca são inseridos em claims ou no corpus.

João 1:1 é a fatia vertical principal. Gênesis 1 comprova que a composição não pressupõe grego:
o texto português e sua fonte ficam disponíveis, enquanto original e linguística são declarados
ausentes. Alinhamentos TAGNT ambíguos continuam ambíguos, sem mapeamento editorial manual.
