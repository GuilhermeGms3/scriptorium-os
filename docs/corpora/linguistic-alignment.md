# Camada linguística e alinhamento — Fase 5

## Limites e contratos

O SBLGNT continua sendo a edição textual. Seus `TokenOccurrence` não recebem lema, Strong
ou morfologia por mutação. `LinguisticRepository` responde por `LinguisticDataset`,
`LinguisticAnnotation`, `TokenAlignment`, `Lexeme`, `LexicalReference` e
`MorphologicalAnalysis`. O contrato `Morphology` existente é reutilizado em `features`.

O `ScriptureKnowledgeEngine.loadLinguisticPassage` carrega a camada; o bundle síncrono
ganha `linguistics: Availability<LinguisticPassage>`. Antes do carregamento, ou fora da
cobertura, a disponibilidade é explícita. Uma passagem pode ter alinhamentos não resolvidos
e nenhuma annotation; esses casos nunca recebem dados de demonstração como substituto.

O inspetor carrega somente o capítulo solicitado. O índice lexical só é carregado quando
a aba de ocorrências é aberta. A estrutura visual, notas e estudos existentes permanecem.
João 1 deixou de ser truncado artificialmente aos cinco versículos demonstrativos; traduções
continuam indisponíveis onde não foram importadas. A concordância navega para o capítulo
e âncora de versículo, sem inventar uma tradução.

## Parsing e identidade

Os dois arquivos TAGNT são processados integralmente, com mapeamento explícito dos 27 livros.
Cabeçalhos, linhas vazias e linhas-resumo `#` não são records. Uma linha desconhecida, livro
desconhecido ou locator duplicado interrompe o importador; nada é silenciosamente descartado.
O locator completo mantém os marcadores de versificação entre colchetes/parênteses/chaves.
Livro/capítulo/versículo primários seguem a referência NRSV fornecida pelo TAGNT. Esta fase não
pressupõe que marcadores de KJV/NA sejam também referências SBL; divergências ficam no audit.

ID de origem: `{datasetId}:record:{locator completo}`. O dataset depende do commit e digest
do pacote, não do horário de execução. Cada record retém a linha do artifact original.

## Algoritmo `edition-aware-sequence-v1`

1. Agrupar por livro/capítulo/versículo. Exigir presença explícita de `SBL` no campo de edições;
   `NKO` não é autorização para associar uma ocorrência a SBL.
2. Aplicar deslocamentos `SBL«N`/`SBL»N` quando fornecidos. A contagem inclui a palavra de
   origem: `«2` a coloca antes da anterior. As chaves fracionárias de ordenação evitam empates.
   O resultado ainda precisa passar pela comparação e unicidade abaixo.
3. Comparar a forma extraída da célula grega, sem substituir o texto SBLGNT. `exact` significa
   igualdade literal entre a superfície SBL e a superfície TAGNT extraída (não a célula com
   transliteração). `normalized` usa a chave descrita na seção Unicode.
4. Admitir grafia alternativa somente no segmento explicitamente atribuído a SBL no campo
   de variantes ortográficas. Não importar um aparato textual ou variantes de sentido.
5. Calcular LCS por programação dinâmica, incluindo matrizes de prefixo/sufixo. Aceitar uma
   ligação somente quando o candidato é único em todos os caminhos ótimos e o alvo não pode
   ser omitido em outro caminho igualmente ótimo. Ocorrências repetidas conservam sua ordem
   e IDs próprios. Vários candidatos ou a possibilidade de pular o alvo geram `ambiguous`.
6. Para uma lacuna única delimitada por dois vínculos aceitos, admitir uma diferença terminal
   de `ν` após `ε/ι` apenas em códigos verbais ou dativos. Isso é inferência posicional,
   identificada como `terminal-nu-difference+adjacent-anchors`, não igualdade textual nem
   alteração do raw. Não há remoção global do `ν`, nem correções manuais por versículo.
7. Deslocamento explícito, variante editorial e a inferência delimitada acima recebem
   `positional`, com evidência distinta. O restante fica sem annotation.

Limite defensivo: até 500 tokens de cada lado por versículo. Complexidade de alinhamento
O(tokens SBL × records SBL) por versículo, não produto cartesiano do Novo Testamento.

## Unicode

Os SourceArtifacts permanecem byte a byte. Célula grega, lema selecionado, código lexical/
gramatical, edições, grafia e Strong+instância originais ficam nos shards, sem normalização.
A superfície normalizada exposta na annotation usa NFC. A chave exclusiva de matching usa
NFC, caixa grega minúscula, decomposição NFD, remoção de marcas diacríticas, elisão/apóstrofos
e caracteres não gregos, seguida de NFC. Essa chave deliberadamente mais permissiva não é
lema, não é texto de leitura e não fornece significado; depende da edição, sequência e
unicidade para alinhar. As transformações estão registradas no manifest.

## Morfologia e lexemas

O parser lê as linhas `CODE\tFunction=...` de TEGMC. `Function`, `Case`, `Number`, `Gender`,
`Tense`, `Voice`, `Mood` e `Person` alimentam o contrato existente. `Form` (infinitivo/particípio),
tipo de nome e outras características ficam em `extras`, sem confundir forma com modo.
Não se deduzem valores ausentes. O código original sempre acompanha a representação.
Cada componente de uma análise composta permanece separado; por isso a contagem de análises
morfológicas pode exceder a contagem de tokens alinhados. Códigos sem definição seriam
`unmapped`; nesta importação nenhum código aceito ficou sem definição.

Lemas são apenas as formas fornecidas antes de `=` no campo Dictionary form. Não são
gerados a partir de Strong. Alternativas e formas compostas são preservadas, sem eleger
arbitrariamente um lema único. A identidade lexical é um hash determinístico das formas NFC
e referências STEP fornecidas. Isso é uma identidade operacional específica desta camada,
não uma afirmação de equivalência ontológica entre todos os léxicos.

`step-disambiguated-strong` retém letras e extensões; `strong` vem do campo sStrong,
sem o sufixo de instância. O raw com `_A`, `_B` etc. não é destruído. As definições de TBESG,
LSJ, BDAG e outros léxicos não foram importadas.

## Armazenamento, leitura e índices

- SBL storage schema 2 omite `editionId`, `textUnitId`, `ref` e `language` herdáveis do token.
  IDs, posição, superfície, pontuação e dados de parágrafo permanecem literais. O decoder
  restaura o domínio anterior; testes comparam todos os 260 capítulos com os XMLs originais.
- TAGNT: um shard por capítulo, com contexto de dataset/artifact compartilhado e dicionário
  local das strings de edições. `TagntRecord` é uma tupla documentada no tipo: locator, linha,
  célula grega, gramática lexical, lema, índice de edições, grafia, sStrong, lexemeId.
- Alinhamento armazenado: versículo, posição, índice de record ou null, status, motivo e
  índices de candidatos. IDs completos são reconstituídos sem perda da identidade.
- 256 buckets lexicais pelo prefixo do hash, cada um com lexemas únicos e listas compactas
  `[bookId, chapter, verse, position]`. Não há um arquivo de annotation por palavra.
- `getOccurrencesByLexeme(id, offset, limit)` usa o bucket correspondente, sem varrer corpus;
  limite de 100, UI com páginas de 30. Um bucket inteiro é transferido na primeira consulta,
  não apenas uma página; o maior tem 396.300 bytes. Isto é uma base local de concordância,
  não um backend paginado nem um motor de busca completo.
- Shards e buckets usam imports dinâmicos Vite. O repositório mantém até oito capítulos
  decodificados; o cache de módulos do navegador permanece sujeito ao ciclo de vida da página.
  `morphology.json` é um pequeno dicionário compartilhado carregado com o capítulo.
- SourceArtifacts e relatórios `audit/` não são importados pelo runtime web.

## Quality gate e limites

O gate exige todos os livros, todos os tokens-alvo contabilizados, unicidade dos vínculos
aceitos e um registro de auditoria para cada alvo não resolvido. O import falha ao perder
capítulos, records ou identidade. A cobertura percentual não é tratada como confiança acadêmica.
O teste percorre todos os vínculos e índices; o golden de João 1:1 confirma três ocorrências
distintas de λόγος com identidade lexical compartilhada.

`audit/targets.json` enumera cada token ambíguo/sem correspondência, motivo e candidatos.
`audit/source-records.json` enumera cada record não utilizado, linha, artifact e motivo.
O shard mantém os records necessários para inspecionar qualquer caso. As classes são
ausência de vínculo SBL, ausência de record compatível e multiplicidade de caminhos ótimos.
O gate não afirma cobertura perfeita; os números e limitações estão no relatório da fonte.

João 7:53–8:11 tem 187 tokens no SBLGNT e zero annotations aceitas nesta versão do TAGNT:
os records não declaram SBL. A UI exibe ausência, não uma análise importada de outra edição.
Não foram usadas exceções manuais para contornar isso.

## Regeneração segura

```sh
npm run corpus:acquire -- stepbible-tagnt
npm run corpus:verify -- stepbible-tagnt
npm run corpus:import -- stepbible-tagnt
npx tsx scripts/corpus/phase5-report.ts
```

O último comando repete acquire/verify/import duas vezes, compara o hash de toda a árvore
e mede bytes. `phase5-metrics.json` registra os resultados. Fonte já existente é revalidada,
não baixada novamente. Não execute regeneração com o Vite observando os arquivos no Windows.
A publicação mantém backup até o sucesso; árvore idêntica não é substituída. O lock exclusivo
bloqueia importadores concorrentes. Staging/backup são filhos validados do diretório do corpus.
