# STEPBible TAGNT — relatório da Fase 5

Implementação local em 2026-08-27, com QA final em 2026-08-28. O corpus textual continua sendo SBLGNT 1.2.
TAGNT fornece uma camada separada, com alinhamento auditável e lacunas explícitas.
Não houve fork, nova dependência, serviço externo de leitura, commit ou push.

## 1. Commit fixado

`efe428a0047bf7b9c3ce2624f60c252c6e435945`, do
[repositório oficial STEPBible-Data](https://github.com/STEPBible/STEPBible-Data/tree/efe428a0047bf7b9c3ce2624f60c252c6e435945).
Pacote `pkg-stepbible-tagnt`; corpus `stepbible-tagnt`; edição `stepbible-tagnt-pinned`.
O candidato genérico `stepbible-data` não foi liberado como um todo.

## 2. Artifacts e checksums

Arquivos exatos relativos à raiz do repositório upstream:

- `README.md`
- `Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt`
- `Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt`
- `Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt`

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| README | 14.495 | `261d5157c0ffeadeedad3f734db945a4c3642e3e4ce5fa28002985b6c52437b1` |
| TAGNT Mat–Jhn | 14.189.032 | `ab8eaaeb68e17a1dcfa34e1e9350358f22f03bc2a97244d848750ad81044bc8e` |
| TAGNT Act–Rev | 15.939.932 | `524e32375361e6d3fa2f7ef00b87605fdc4317a762f395651a05fdc31ad031b7` |
| TEGMC | 467.056 | `5f0416f7617019a6082285214903bde569a980d5fd3b88b8d7020d944e94de82` |

Digest do pacote: `cf25559458fc739b475234ecea7396ebcebaba67ec5cfc1a17615e44a7c596a9`.
Os bytes originais e o manifest de custódia estão em
`corpora/source/stepbible-tagnt/efe428a0047bf7b9c3ce2624f60c252c6e435945/`.

## 3. Direitos e attribution

O README fixado e os três cabeçalhos de dados declaram CC BY 4.0 e permitem inclusão em
software. O crédito é STEP Bible, com link para [STEPBible](https://www.stepbible.org/),
e Tyndale House Cambridge. O manifest registra cinco evidências: README, os três cabeçalhos
e o notice de TBESG (consultado para identificar a origem lexical; o léxico não foi importado).

Há uma ressalva real: os cabeçalhos pedem centralização da distribuição e que o usuário não
redistribua os arquivos por conta própria. A interpretação operacional documentada trata
isso como pedido adicional, não como substituição da licença e da permissão explícita de uso
em software. O próprio [texto oficial CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en)
distingue pedidos especiais do licenciante das condições da licença. Não é parecer jurídico;
o pedido não foi apagado dos originals. Crédito, link oficial e aviso de transformação são
mantidos. Revisão jurídica adicional pode alterar a decisão operacional no registry.

O gate vale para as capabilities selecionadas, não para uma biblioteca upstream inteira.
As traduções em inglês vêm da Berean por permissão declarada; espanhol e sub-significados
citam Marvel/OpenGNT/CSG/TIPNR. Não presumimos permissão idêntica para republicar esses campos.
Eles não entram nas annotations nem na distribuição web. Os artifacts completos ficam
localmente para auditoria; publicar um arquivo de fontes completo exige revisar também
os campos excluídos. Nenhuma publicação de fontes ou deploy foi feita nesta tarefa.

## 4. Campos encontrados

Word & Type; Greek (forma + transliteração); English translation; dStrongs = Grammar;
Dictionary form = Gloss; editions; Meaning variants; Spelling variants; Spanish translation;
Sub-meaning; Conjoin word; sStrong+Instance; Alt Strongs. Há também linhas-resumo por verso,
cabeçalhos repetidos e notas de variantes.

## 5. Campos utilizados

Locator e linha; forma/transliteração grega; dStrong e gramática; somente a parte lexical
antes das glossas; membership e deslocamentos de SBL; variantes ortográficas atribuídas a
SBL; sStrong e sua instância raw. TEGMC fornece as definições estruturadas dos códigos.
Não se importaram traduções, glossas, sub-significados, notas interpretativas, conjoin,
Alt Strongs ou aparato textual. A transliteração é atribuída ao TAGNT e não é pronúncia.

## 6–15. Contagens automáticas

| Item | Métrica | Resultado |
| --- | --- | ---: |
| 6 | Records TAGNT processados | 142.096 |
| 6 | Records com membership SBL | 137.210 |
| 7 | Tokens-alvo SBLGNT | 137.741 |
| 8 | Exact | 82.918 |
| 9 | Normalized | 53.740 |
| 10 | Positional | 416 |
| 11 | Ambiguous | 75 |
| 12 | Unmatched | 592 |
| 13 | Total alinhado | 137.074 — 99,5158% |
| 14 | Análises morfológicas atribuídas (inclui componentes) | 137.321 |
| 14 | Códigos atribuídos sem definição TEGMC | 0 |
| 15 | Tokens com identidade lexical | 137.074 |
| 15 | Identidades lexicais únicas na fonte | 5.621 |
| 15 | Identidades com ocorrência SBL aceita | 5.586 |
| — | Livros / capítulos | 27 / 260 |

Classificação dos 667 alvos não resolvidos: 339 sem membership SBL na fonte; 253 sem record
SBL compatível; 75 com multiplicidade de caminhos ótimos. Todos estão em `audit/targets.json`.
Os 5.022 records sem alvo aceito também são enumerados em `audit/source-records.json`:
4.886 sem membership SBL e 136 com membership mas sem vínculo aceito.

Não há promessa de cobertura perfeita nem preenchimento manual dos resíduos. O quality gate
verifica cobertura de processamento, integridade, unicidade e auditabilidade; ele não transforma
essas métricas em certeza filológica. [Algoritmo e limitações](./linguistic-alignment.md).

## 16. Concordância

`LinguisticRepository.getOccurrencesByLexeme` consulta um dos 256 buckets lexicais, com
offset/limit validado. A UI mostra páginas de 30 e navega para capítulo/versículo. Os buckets
somam 4.794.335 bytes; não há varredura nem transferência de todos os 137 mil tokens para
calcular ocorrências. A paginação visual é local sobre o bucket carregado, não paginação HTTP.

## 17. João 1:1

As três ocorrências SBLGNT `...:john:1:1:005`, `008` e `017` são distintas. Apontam para
`Jhn.1.1#05=NKO`, `#08=NKO` e `#17=NKO`, respectivamente, sem reutilizar um record.
As três compartilham `lexeme:tagnt:a12b64a9e2eb472d58c7af59`:
lema `λόγος`; dStrong/Strong `G3056`; código `N-NSM`; substantivo, nominativo, singular,
masculino. Status: normalized. A concordância tem 328 ocorrências aceitas deste lexema.

## 18. João 7:53–8:11

187 tokens SBLGNT processados; zero vínculos aceitos; 187 unmatched por falta de membership
SBL nos registros TAGNT. O SBLGNT mantém a passagem integralmente. O inspector não inventa
análises nem importa silenciosamente uma análise de outra edição.

## 19. Exemplo de provenance

`sblgnt:1.2:john:1:1:005` → alinhamento normalizado →
`dataset:tagnt:efe428a0047bf7b9c3ce2624f60c252c6e435945:cf25559458fc739b:v1:record:Jhn.1.1#05=NKO`
→ linha 85.331 do artifact TAGNT Mat–Jhn → SHA-256 `ab8eaaeb...044bc8e` → commit fixado.
O inspector mostra o token, record, commit, checksum, valores originais e link da fonte.
A provenance do texto SBLGNT permanece distinta da provenance da análise TAGNT.

## 20. Auditoria de armazenamento

| Medida | Bytes |
| --- | ---: |
| SBLGNT gerado antes | 74.746.655 |
| SBLGNT gerado depois | 23.829.469 |
| Economia SBLGNT | 50.917.186 — 68,12% |
| TAGNT + TEGMC + README originais | 30.610.515 |
| Originais TAGNT incluindo manifest de custódia | 30.614.834 |
| TAGNT gerado, índices e audits | 33.726.686 |
| Total de fontes + gerados de ambos os corpora | 95.042.559 |
| Maior capítulo SBLGNT / média | 216.690 / 91.576,42 |
| Maior capítulo TAGNT / média | 251.389 / 106.728,58 |
| Maior bucket lexical / média | 396.300 / 18.727,87 |

Diagnóstico anterior: 28.280.762 bytes eram whitespace JSON. Nos tokens, `ref` ocupava
11.527.562 bytes; `textUnitId`, 5.329.217; `editionId`, 3.443.525; idioma, 2.341.597.
IDs próprios somavam 4.778.253 e paragraphId 5.717.053 — esses foram preservados literalmente.
Não havia objetos completos de direitos/provenance por token; a expansão não veio de índices
lexicais, que ainda não existiam. A mudança remove apenas whitespace e quatro campos herdáveis.
As medidas de campos incluem nomes/chaves; não devem ser somadas a medidas de árvore como
se fossem arquivos independentes.

## 21. Performance e idempotência

Dois ciclos acquire/verify/import: 15.409 ms e 17.165 ms, com fonte local já adquirida.
Ambos produziram os mesmos 520 arquivos e hash de inventário
`08e391c09172cc79c4f9d06b209cea0205af3acac700ba84a5f93d63ab03fbff`.
O inventário usa caminho, tamanho e SHA-256 de cada arquivo, ordenados; horários da medição
não entram no dataset. [Medições reproduzíveis](./phase5-metrics.json).

O entry JS do último build medido tem aproximadamente 416 kB bruto/127 kB gzip; isso não é
o custo total da página. Texto e linguística permanecem em chunks separados por capítulo;
lexemas/ocorrências em buckets lazy. Não se mediu Core Web Vitals, rede móvel ou hardware externo.
O dicionário morfológico compartilhado é lazy; o maior bucket ainda pode ser refinado no futuro.

## 22. Validação

- `npx tsc --noEmit`: passou.
- `npm test`: 56 testes em cinco arquivos, todos passando.
- `npm run build`: client, SSR e Nitro passaram; avisos de configuração Vite/Nitro existentes.
- ESLint focado nos arquivos da fase: passou. O lint global não foi repetido; há dívida prévia de CRLF/Prettier.
- `git diff --check`: passou, com avisos de conversão LF/CRLF do Git.
- Navegador local: lema de λόγος; concordância de 328 ocorrências, páginas 1–30 e 31–60;
  clique em Marcos 2:2 abriu `/scripture/mark/2#verse-2`, com SBLGNT e contexto atualizado;
  fonte de João 1:1 exibiu linha 85.331, token, record, commit e SHA-256 completos.
  João 8:1 mostrou ausência de análise e motivo `no-sbl-membership`, também no drawer móvel
  em 390 × 844. Nenhum warning/error capturado no console nessa sessão de QA.
  Isso não equivale a teste em aparelho físico, auditoria completa de acessibilidade ou teste de carga.
- `npx tsx scripts/corpus/phase5-report.ts`: dois ciclos de aquisição/verificação/importação,
  árvore idêntica e métricas registradas.
- Tests incluem corrupção de checksum, direitos, parsing, 27 livros, referências, membership,
  Unicode, todos os status, ordem editorial, duplicatas, índice, golden, pericope, extremos do NT,
  provenance, lazy loading e igualdade integral dos capítulos SBL reconstituídos com o XML.
- Falha encontrada durante QA: Windows bloqueou rename com Vite ativo. Servidor foi parado,
  dataset regenerado e publicação ganhou backup/rollback, no-op para árvore idêntica e lock
  de escritor. Teste prova preservação do snapshot quando a substituição falha.

## 23. O que continua DEMO ou ausente

WEB/ASV e amostras antigas fora do SBLGNT continuam demonstrativas/parciais. Grafo, alegações,
fontes bibliográficas, estudo de exemplo e conteúdo interpretativo anterior não viraram
pesquisa real por causa desta fase. Notas/estudos do usuário preservam a persistência local.
Exegese, hermenêutica, LXX, hebraico, tradução portuguesa, glossas e léxicos completos continuam
ausentes. A barra de status ainda contém linguagem de demonstração do produto anterior.

## 24. Próxima fase recomendada, não implementada

Uma fase de curadoria editorial dos resíduos de alinhamento e política de distribuição,
antes de acrescentar outra camada linguística. MorphGNT pode ser avaliado futuramente como
fonte comparativa, com revisão própria de licença e sem misturar suas análises com TAGNT.
Não foi adquirido nem incorporado nesta fase.
