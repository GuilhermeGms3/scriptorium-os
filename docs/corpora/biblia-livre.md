# Bíblia Livre N4 — relatório da Fase 6

Implementação local concluída em 2026-09-07. O pacote oficial específico abaixo não altera nem apaga o candidato genérico `pkg-biblia-livre-unresolved`, que continua registrando o conflito histórico entre distribuidores.

## 1–7. Fonte, direitos e edição

1. Commit fixado: `a315a15e9f4d01883b62206fe441d57762f126b3` (Versão 2025.1.0, 2025-01-12).
2. Artifacts: 66 arquivos `textos/f4/n4/*.txt`, `README.md` e `LICENCA.md`; inventário, tamanho e SHA-256 de cada um em `corpora/source/biblia-livre/<commit>/artifact-manifest.json`. Digest dos 68 artifacts: `8ec95eabb3a03f017cec34eeb6571dab09893478027c5b46b1774fa5c7c6b94e`.
3. Formato encontrado: F4 oficial, UTF-8 com BOM, um arquivo por livro. `\v Sigla.C.V` delimita versos; blocos `name-*`, `abbreviation`, `ubs-code`, `added`, `fn`, `key`, `ref` e `psalm-title` estruturam o texto. Não é o artifact USFM de releases.
4. Evidência: README fixado e licença integral fixada declaram Creative Commons Atribuição 3.0 Brasil, reprodução/modificação/distribuição com atribuição. Esta decisão vale somente para este package oficial; não é parecer jurídico.
5. RightsGate: `verified`, redistribuição/modificação/uso comercial permitidos, atribuição obrigatória. Package: `biblia-livre-official-a315a15e9f4d01883b62206fe441d57762f126b3`.
6. Atribuição preservada e acessível no Reader: “Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, http://sites.google.com/site/biblialivre/ — versão 2025.1.0. Licença Creative Commons Atribuição 3.0 Brasil (http://creativecommons.org/licenses/by/3.0/br/). Reprodução permitida desde que devidamente mencionados fonte e autores.” O complemento identifica a conversão F4.
7. Edição: `biblia-livre-n4-2025.1.0`, N4/Nestle 1904 no NT; não é apresentada como tradução do SBLGNT. O AT é o texto comum descrito pelo projeto upstream.

Fonte canônica: [blivre/BibliaLivre no commit fixado](https://github.com/blivre/BibliaLivre/tree/a315a15e9f4d01883b62206fe441d57762f126b3).

## 8–13. Inventário, estrutura e versificação

| Métrica automática             |      Resultado |
| ------------------------------ | -------------: |
| Livros                         |             66 |
| Capítulos                      |          1.189 |
| Versículos / TextUnits         |         31.101 |
| Artifacts / bytes-fonte        | 68 / 4.582.764 |
| Títulos `psalm-title`          |            116 |
| Notas `fn`                     |          1.167 |
| Parágrafos explícitos          |              0 |
| Mapeamentos canônicos ausentes |              0 |
| Anomalias de versificação      |              1 |
| Bytes gerados                  |      8.472.398 |

O F4 N4 desta revisão não possui marcador de parágrafo; nenhum parágrafo foi inferido. Acréscimos marcados permanecem no texto visível. Notas, chaves, referências e títulos são reconhecidos e contados, mas não são concatenados ao verso. Os originals preservam todos esses marcadores.

A única anomalia é `mark:omitted:5:19`: o arquivo N4 salta de Marcos 5:18 para 5:20. O manifest registra `omitted`; o importer não renumera nem fabrica o verso. No bundle NT, o SBLGNT pode ter seu TextUnit canônico 5:19, mas isso não cria texto português nem word alignment.

## 14–18. Runtime e experiência de leitura

14. Lazy loading: 1.189 shards por capítulo via `import.meta.glob`; abrir João 1 carrega apenas os módulos de João 1 necessários. O corpus inteiro não entra no JavaScript inicial.
15. `ScriptureRepository.getPassage` aceita tanto `PassageRef` quanto `{ edition, book, chapter }`. A UI desconhece caminhos de arquivos e mescla edições pelo PassageRef canônico.
16. João 1:1 abre por padrão com Bíblia Livre (“No princípio era a Palavra…”); Texto original usa os tokens SBLGNT. Selecionar `λόγος` continua resolvendo exclusivamente TAGNT.
17. Comparação apresenta BLIVRE N4 e SBLGNT lado a lado por versículo. Isso é passage alignment, nunca alinhamento de palavras.
18. `PassageKnowledgeBundle.texts[]` contém uma camada por Edition, com TextUnits e Provenance próprios. `originals` permanece SBLGNT e `linguistics` permanece TAGNT. A validação rejeita TextUnits misturados entre edições.

O rodapé usa disclosure progressivo: edição, idioma, licença e atribuição completa aparecem em `details`, sem repetir atribuição em cada versículo. Os 667 resíduos TAGNT e João 7:53–8:11 continuam com a política `ambiguous/unmatched → linguistic data unavailable`.

## 19. Performance e idempotência

- Fonte: 4.582.764 bytes; gerados: 8.472.398 bytes em 1.190 arquivos.
- Shard médio: 7.060,67 bytes; maior: Salmos 119, 36.533 bytes.
- Dois ciclos acquire/verify/import com fonte local: 948 ms e 964 ms na rodada final.
- Ambos produziram hash de árvore `b9c97e05c74f36fc817838339f1b5ca39ac6c1ed867bd93e8d38e495ea544ce9`.
- O entry chunk permaneceu em 416.198 bytes (125.997 gzip); o chunk do repositório ficou em 251.846 bytes (36.070 gzip). Os 1.189 capítulos continuam em chunks separados.
- Medições reproduzíveis: [phase6-metrics.json](./phase6-metrics.json).

## 20. Testes e build

- `npm test`: 64 testes em seis arquivos, todos passando.
- `npx tsc --noEmit`: passou após a integração.
- `npm run build`: passou com 3.987 módulos do cliente transformados e saída Nitro gerada.
- ESLint dos arquivos alterados: passou. O `npm run lint` global continua bloqueado pelo débito anterior de finais de linha CRLF/Prettier: 2.954 erros e 9 avisos fora do escopo desta fase.
- QA real em navegador: João 1 abriu em português; comparação BLIVRE/SBLGNT, texto original, seleção de `λόγος` com TAGNT, Gênesis 1 e disclosure CC-BY-3.0-BR funcionaram. Após corrigir a reconstrução de Provenance na hidratação, uma sessão limpa do Vite não registrou novo erro de hidratação.
- `npm run preview` não inicia a saída Nitro atual: a configuração existente procura `dist/server/server.js`, enquanto o build produz `.output/server/index.mjs`. Portanto, o runtime de produção local não foi validado por esse script; o QA acima foi feito no servidor Vite de desenvolvimento.
- Testes cobrem rights/custódia, parser, Unicode, discovery, 66 livros, extremos, OT/NT, versificação, multi-edition, João 1:1, bundle multi-source, reconstrução de Provenance após serialização, ausência de tokens portugueses e regressões SBLGNT/TAGNT.

## 21. Dados ainda DEMO ou ausentes

Conhecimento, fontes bibliográficas e análises de exemplo anteriores continuam identificados como DEMO. Não foram importados word alignment, interlinear português, LXX, hebraico, outra tradução, léxico, apparatus, exegese, patrística, RAG ou LLM. Notas/títulos F4 ainda não possuem UI editorial própria, embora sejam auditados e preservados nos originals.

## 22. Próximo passo recomendado — não implementado

Criar uma camada editorial para notas/títulos F4 e revisar a anomalia Marcos 5:19 contra evidência da própria edição, sem forçar correspondência. Só depois avaliar um dataset explícito de alinhamento tradução↔original, com metodologia e provenance independentes.

## Regeneração

```sh
npm run corpus:acquire -- biblia-livre
npm run corpus:verify -- biblia-livre
npm run corpus:import -- biblia-livre
npx tsx scripts/corpus/phase6-report.ts
```

Acquisition, verification e import reutilizam o pipeline universal. Discovery é automático; não há chamadas por livro/capítulo. A fonte imutável nunca é substituída por output normalizado.
