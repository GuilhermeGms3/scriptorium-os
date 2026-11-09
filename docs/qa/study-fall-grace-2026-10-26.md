# QA — Queda, graça e providência — 26/10/2026

## Escopo

Novo percurso Android/web com 14 módulos, 18 aulas, 90 seções e cerca de
6.815 palavras de exposição original. Uma fonte por vez na seleção do acervo;
fundamentação recolhível; casos, objeções, conceitos e síntese próprios das unidades.
Os cursos antigos, árvore, requisitos de progresso e funcionalidades independentes
continuam preservados. Fontes e limites estão em
`docs/content/queda-graca-providencia-2026-10-26.md`.

## Verificações executadas

| Comando ou fluxo | Resultado |
| --- | --- |
| `npm run typecheck` / `tsc --noEmit` | Aprovado. |
| `npm run test:quick` | 587 testes em 94 arquivos, sem falhas. |
| ESLint dos arquivos TS/TSX alterados e novos | Sem erros/avisos. |
| Prettier dos arquivos TS/TSX alterados e novos | Aplicado; verificação dos arquivos de interface aprovada. |
| `npm --ignore-scripts run build` | Aprovado; sem reconstrução do corpus. |
| `:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest` | Aprovado; 73 testes JVM, zero falhas. |
| `:app:lintDebug` | Aprovado, zero erros e 49 avisos preexistentes. |
| `git diff --check` | Aprovado. |

O teste editorial confere as 14 unidades, cinco vias separadas, progressão,
IDs de passagens/entidades/obras, referências, fundamentação e localizadores.
As fixtures anteriores continuam verificando os IDs e requisitos de progresso
da formação, introdução e aulas antigas. Discordância argumentada pode cumprir
os critérios de estudo: o sistema não exige adesão às teses do conteúdo.

APK Android 0.6.6, código 18. O asset `reading-labels.json` extraído do APK é
idêntico ao gerado, SHA-256:
`d4f82ab58b93c232dd118227926b7889795f1b65d2d0d7aa561232690147674d`.
Não houve banco, migração, pacote de corpus, PDF ou dependência nova.

## Navegador

Browser plugin indisponível; utilizado Playwright já instalado no runtime,
sem acrescentar dependências ao projeto. Porta isolada 5174, perfil OPFS
temporário e bloqueio de `/api/workspace/**`; o backend pessoal do PC não foi usado.

Fluxo aprovado em 1440×1000 e 390×844:

- Estudos → Percursos → novo currículo; 14 pontos, 13 inicialmente pendentes.
- Conteúdo e fundamentação do primeiro módulo.
- Fonte real de Agostinho no catálogo; link abre o leitor da Biblioteca e o
  texto original instalado, não apenas uma ficha bibliográfica.
- Cinco aulas das vias, conteúdo da quinta via e contraponto de Westminster
  no módulo sobre Sheol.
- Módulos de calvinismo, luteranismo, anglicanismo, oração e síntese acessíveis.
- Sem erro de aplicação capturado ou overflow horizontal da página.

Para inspecionar os módulos avançados na web, foram salvas conclusões válidas
**apenas no perfil temporário**, pelo repositório existente. Isso verifica consumo,
estado e persistência, não equivale a alguém concluir todas as leituras pela UI.

Screenshots em `%TEMP%`: `study066-content-desktop.png`,
`study066-fiveways-mobile.png`, `study066-sheol-mobile.png`,
`study066-library-desktop.png`, `study066-open-source-desktop.png`.
Foram inspecionados conteúdo, tipografia, leitura do acervo e navegação real.

O teste de abertura detectou um erro no botão novo: obra completa sem `unitId`
não pode ser enviada à janela destinada a trechos. Foi corrigido para usar
`/library/read/$workId`, conforme o componente de leituras já existente.
Trechos identificados continuam usando a janela de contexto. O reteste abriu
o texto real e passou.

## Android nativo

Emulador dedicado `Scriptorium_Feedback_QA`, porta 5562, com acervo real e rede
desligada durante o teste. O cenário
`fallGraceCourseLinksInstalledBooksAndPreservesIndependentProgress` passou em
77,454 s e verificou:

- Novo currículo no catálogo, sem duplicar Gênesis ou alterar seu ID de progresso.
- 14 módulos; futuros pontos pendentes.
- Obra real `work:augustine-confessions` vinculada ao primeiro módulo.
- Salmo 13 aberto no capítulo e versículo corretos.
- Aula, leituras, resposta e critérios; conclusão recusada com critérios pendentes.
- Conclusão de A, liberação de B, contexto da primeira via e fundamentação tomista.
- Retomada no módulo 2 após reiniciar a aplicação.

Screenshots extraídos em `%TEMP%`: `study066-native-map.png`,
`study066-native-library.png`, `study066-native-first-way.png`.
A trilha e a primeira seção foram inspecionadas visualmente.

Na primeira inicialização fria do emulador ocorreu “System UI isn't responding”
antes de o fluxo do aplicativo começar. O emulador foi reiniciado, mantendo a
rede desligada; o reteste completo passou. Isso não foi identificado como falha
do Scriptorium nem foi ocultado pela desativação de testes.

O teste usa dados de progresso exclusivamente do emulador; não foi executado no
celular pessoal. Os últimos ajustes editoriais foram em títulos de seções de
providência, luteranismo, oração e síntese; o APK final foi regenerado e seu asset
conferido. Esses títulos não alteram os IDs nem as regras dos fluxos testados.

## Limites

- Sem revisão acadêmica humana integral ou certificação de cada interpretação.
- A obra local pode começar numa unidade anterior ao localizador indicado;
  a aula orienta a conferir a seção na edição. Não há associação fictícia de página.
- Nenhuma tradução integral nova, curadoria de vídeo ou sincronização de progresso.
- Fontes externas exigem rede; exposição editorial e obras instaladas ficam offline.
- Os cinco testes pesados de corpora excluídos por `test:quick` não foram repetidos:
  seus importadores e bancos não foram alterados.
- Celular físico ausente no ADB durante a validação; não confundir QA do emulador
  e APK gerado com atualização efetiva no aparelho.
