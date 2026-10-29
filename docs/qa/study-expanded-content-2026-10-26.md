# QA — Conteúdo ampliado de Estudos — 26/10/2026

## Escopo

Percurso Queda, graça e providência:22.054 palavras,303 parágrafos,14 módulos,
18 aulas e 90 seções. Cada aula tem mais de 1.000 palavras. São 33 referências,
17 adicionais, e 18 conexões bíblicas complementares. Fontes e limites em
[aprofundamento editorial](../content/queda-graca-aprofundamento-2026-10-26.md).

Preservados ID/revisão, módulos, aulas, seções, leituras obrigatórias, critérios e
regras de desbloqueio. `progress-baseline.json`, capturado antes da expansão,
confere a estrutura anterior e a validade do trabalho já salvo. Sem migration,
banco, dependência, corpus ou cópia de livros novos. As conexões são opcionais.

## Comandos e resultados

| Verificação | Resultado |
| --- | --- |
| `npm run test:quick` | 588 testes /94 arquivos aprovados. |
| `tsc --noEmit` | Aprovado. |
| ESLint dos arquivos TS/TSX alterados | Aprovado. |
| Prettier direcionado com `--ignore-path .gitignore` para o conteúdo | Aplicado e conferido; nenhuma reformatação de módulos alheios. |
| `npm run mobile:labels` | Aprovado; conteúdo único entregue ao Android. |
| `npm --ignore-scripts run build` | Aprovado; corpus não reconstruído. |
| `:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest` | Aprovado;75 testes JVM sem falhas. |
| `:app:lintDebug` | Aprovado;0 erros 49 avisos preexistentes. |
| `git diff --check` | Aprovado. |

Testes incluem identidade da progressão anterior, cobertura de todas as aulas,
fontes resolvíveis, parágrafos por contexto, preservação de hipóteses/contrapontos,
leituras opcionais e igualdade do currículo entregue à web e ao Android.

## Navegador

Browser plugin indisponível:Playwright já instalado no runtime. Porta 5174,
OPFS temporário e `/api/workspace/**` bloqueada; não foi usado o workspace pessoal.

Aprovados em 1440 × 1000 e 390 × 844:

- Percursos → curso;14 pontos e bloqueio inicial dos 13 seguintes.
- Conteúdo ampliado e fundamentação, leituras reais, abertura de Confissões na Biblioteca.
- Cinco vias como aulas distintas, com pelo menos três parágrafos por seção.
- Contraponto de Westminster no módulo Sheol.
- Conexões de Cristo → João 1, versículo inicial renderizado no leitor.
- Retorno ao curso, seleção de Cristo e exposição nova visível.
- Módulos confessionais, oração e síntese;sem overflow horizontal ou erro de aplicação.
- Movimento preservado;preferência de redução cancela as animações próprias.

Para inspecionar módulos avançados foram inseridas conclusões válidas no perfil
descartável. Isso verifica consumo e persistência, não representa estudo humano.
O curso mantém seu comportamento anterior:ao remontar sem seleção de módulo,
retoma o próximo não concluído. O teste seleciona Cristo novamente após retornar.
A primeira navegação fria excedeu 30 s sob carga de builds;retentativa usou
DOMContentLoaded e prazo explícito, sem alteração no código de inicialização.

Capturas temporárias:study 068-content-desktop.png, study 068-fiveways-mobile.png,
study 068-christology-mobile.png, study 068-sheol-mobile.png e fontes abertas.

## Android nativo

Emulador dedicado `Scriptorium_Feedback_QA`, porta 5562, acervo real instalado.
Teste opt-in `expandedCourseOpensSupplementalBibleReadingAndRetainsPriorWork`:
**aprovado em 23,934 s**.

- Usa trabalho válido inserido apenas no emulador para acessar o módulo 6.
- Abre a etapa Leituras e conexões e o complemento João 1:1–18.
- Confere livro, capítulo e versículo inicial no leitor e intervalo no currículo.
- Volta à conclusão de Cristo e encontra a exposição nova sobre ressurreição.
- Confere que o `work_json` anterior do primeiro módulo não foi alterado.

Uma asserção inicial esperava o fim do intervalo na preferência de retomada.
O leitor já salva o versículo visível e limpa esse fim ao acompanhar a rolagem;
a asserção foi corrigida para verificar abertura inicial e metadado da conexão,
sem mudar essa regra existente. Não alegar persistência do intervalo na retomada.
Capturas study 068-native-christology.png e study 068-native-connections.png
foram extraídas do emulador e inspecionadas.

## APK e limites

APK 0.6.8/code 20, em `android/app/build/outputs/apk/debug/app-debug.apk`.
O asset do APK é idêntico ao arquivo editorial gerado:1.335.687 bytes, incremento
real de 151.605 bytes em relação à versão anterior. SHA-256:
`abb 9 f 56194 ab 3 ae 7 f 68 f 2 ecb 99 f 317 c 706 d 4 f 59 c 103 a 59 f 8 af 5039 e 2 fc 2 a 8965`.

Telefone pessoal ausente do ADB;não houve instalação física. Os testes verificam
conteúdo entregue, navegação e regras, não revisão teológica humana independente.
Sem novas páginas privadas ou citações literais inventadas. Vídeos e demais
funcionalidades existentes não foram alterados nesta expansão editorial.
