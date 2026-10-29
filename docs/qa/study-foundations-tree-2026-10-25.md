# Estudos: fundamentação, árvore e organização — 25/10/2026

## Escopo

Android 0.6.5 (17) e web: árvore visual horizontal com estados dourado/cinza;
áreas Árvore/Percursos/Temas; título formal do percurso introdutório; animação
de expansão; fundamentação recolhível e fontes com perspectiva e alcance.
Escrituras, Biblioteca, Rastro, corpus e tabelas pessoais não foram redesenhados.

Os IDs e os requisitos de progresso anteriores são preservados. A fixture
`scripts/mobile/study-progress-baseline.json` continua conferindo os módulos,
aulas, leituras e quantidade de capítulos. A alteração editorial é entregue
pelo asset; nenhum PDF ou pacote de acervo foi reexportado.

## Fundamentação

- Seis módulos iniciais: recortes de afirmações com fonte/localizador/alcance.
- Demais capítulos: bibliografia temática explicitamente distinguida de uma
  atribuição comprovada frase a frase. Não equivale a revisão acadêmica humana.
- Texto bíblico, argumento tomista, recepção doutrinal e objeto arqueológico
  não são tratados como evidências intercambiáveis.
- A documentação museológica de Pilatos contextualiza; não comprova expiação.

## Verificação web

Browser plugin indisponível nesta sessão; Playwright já instalado no runtime
foi usado, sem dependência de teste nova no projeto. Porta isolada 5174 e perfil
temporário OPFS; requisições ao backend pessoal bloqueadas pelo teste.

Fluxo: `/study` → nó pendente mostra pré-requisito → Temas/busca por Trindade
→ percurso introdutório/fundamentação → URL direta de guia bloqueado
→ Formação em Teologia → árvore com movimento reduzido.

Resultado: fluxos aprovados em 1440×1000 e 390×844, sem erro de aplicação
capturado e sem overflow horizontal da página. Screenshots locais:
`study065-tree-desktop.png`, `study065-tree-mobile.png`,
`study065-themes-mobile.png`, `study065-foundation-mobile.png` em `%TEMP%`.
Foram inspecionadas a árvore desktop/mobile e a fundamentação.

O desenho adapta a referência do usuário aos temas existentes; não importa
imagens do jogo. Pontos futuros continuam visíveis em cinza. Leitores de tela
e teclado têm seletor textual e indicação de estado, além da cor.

## Limites

As fontes novas foram conferidas como documentos primários/contextuais; isso
não constitui revisão acadêmica de todas as aulas. Vídeos e sincronização
entre dispositivos não fazem parte desta mudança. Fontes web exigem internet.
O celular pessoal não estava listado pelo ADB durante a validação inicial;
teste em emulador não significa instalação no aparelho.

## Verificação final e ocorrências

- `npm run typecheck`: aprovado.
- `npm run test:quick`: 583 testes, 93 arquivos, sem falhas.
- ESLint dos arquivos TypeScript/TSX alterados: sem erros/avisos.
- Prettier dos arquivos novos de interface: aprovado; `git diff --check` aprovado.
- `npm --ignore-scripts run build`: aprovado, preservando os índices existentes.
- Gradle `:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest`:
  aprovado. 72 testes JVM, zero falhas/erros.
- Gradle `:app:lintDebug`: aprovado, zero erros e 49 avisos preexistentes.
- Asset `reading-labels.json` no APK idêntico ao gerado:
  SHA-256 `5c659d0bc0799bd6bbf559bd84b986554b71fc3ed0dcc6ca56f43d1fa746ee33`.

Emulador dedicado `Scriptorium_Feedback_QA`, porta 5562, acervo real instalado:
temas/aprofundamento e Formação passaram juntos; o percurso introdutório passou
no reteste final (98,684 s). A fundamentação foi aberta e conferida pela UI,
incluindo o localizador tomista; conclusão incompleta recusada, leitura vinculada
aberta, módulo A concluído, B liberado e retomada após reinício conferida.
As cinco conclusões restantes foram semeadas somente no emulador para verificar
a liberação da árvore; isso não é evidência de estudo humano desses módulos.

Ocorrências de QA: o seletor antigo de Trindade atingia o texto do campo em vez
do resultado; passou a selecionar a seta do resultado. A lista de leituras
também precisava aguardar os cartões assíncronos da Biblioteca antes de rolar
até a passagem. Os retestes passaram após tornar essa espera explícita.
Uma execução intermediária do lint ficou presa no detector de texto bidirecional;
o processo dessa execução foi encerrado e a execução final limpa passou em
1 min 22 s. Nenhuma regra de lint foi desabilitada.

Inspeção adicional em tema preto com movimento reduzido: árvore visível e
conexões completas; normalização do traçado SVG sem `non-scaling-stroke` evita
lacunas nas linhas quando o diagrama é redimensionado. No Android, o dourado
usa contraste adequado ao fundo claro ou escuro.

Não foram executados os testes pesados de reimportação de corpora excluídos por
`test:quick`: não houve alteração nesse pipeline. Nenhum teste que modifica
progresso pessoal foi executado no telefone do usuário.
