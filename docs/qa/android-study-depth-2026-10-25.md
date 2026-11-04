# QA — ampliação do conteúdo de Estudos — 25/10/2026

Android 0.6.4/code16. Escopo e fontes:
`docs/content/study-deepening-2026-10-25.md`.

## Verificações

- `npm run mobile:labels`: conteúdo editorial gerado, sem abrir o banco privado.
- `npm run typecheck`: aprovado.
- Vitest focado: catálogo, casos bíblicos, deduplicação, referências e compatibilidade
  com o fixture de progresso da versão anterior; aprovado.
- `npm run test:quick`: 579 testes aprovados em 92 arquivos.
- ESLint focado nos arquivos TypeScript/TSX alterados: aprovado. Prettier aplicado
  aos arquivos não ignorados pela configuração existente; não reformata corpora.
- `npm --ignore-scripts run build`: aprovado. O script Vite foi executado com os
  índices existentes; o prebuild que reconstrói índices não foi necessário.
- Gradle assembleDebug/assembleDebugAndroidTest/testDebugUnitTest/lintDebug:
  aprovado; 71 testes JVM, zero falhas; lint sem erros e com 49 avisos.
- `git diff --check`: aprovado.

## Navegador

Plugin Browser ausente; usado Playwright do runtime já instalado, sem dependência
nova no projeto. Perfil temporário e origem 127.0.0.1:5174, com o backend privado
bloqueado apenas nessa sessão de QA. Não escreveu no workspace canônico.

Fluxo: guia Bíblia e interpretação → Caso de leitura → Minha síntese → Análise.
Texto mudou conforme o contexto selecionado. Identidade da página e título corretos,
sem erros JS, overlay de framework ou overflow horizontal. Inspeção em 1440×1000 e
390×844, com screenshots. Log: `LOCALAPPDATA/Temp/scriptorium-study-depth-browser.log`.

## Android nativo

Emulador dedicado na porta5562, com acervo real já instalado. Apenas APK atualizado;
nenhum pacote de PDFs foi reimportado. Testes opt-in alteram somente progresso de QA,
e não foram executados no telefone pessoal.

- Verificação de que as 111 aulas do catálogo antigo recebem o aprofundamento novo.
- Troca Análise/Caso de leitura/Minha síntese com texto efetivamente visível.
- Link de Mateus28:16–20 abriu Mateus28 no versículo16, com retorno à aula.
- Conhecer para amar: requisitos, atividade, conclusão de A, liberação de B e retomada.
- Formação geral: trabalho incompleto recusado, conclusão após atividade e critérios,
  próximo módulo liberado e retomada com os mesmos IDs.

A primeira tentativa foi bloqueada por ANR de **System UI**, antes da abertura do
app. O emulador dedicado foi reiniciado com rede desligada para QA. Na rodada
seguinte, dois cenários passaram; o novo cenário precisava rolar além do título
para alcançar o parágrafo de aprofundamento. A espera do teste foi corrigida,
sem alterar produção, e o cenário passou no reteste em25,457s. Assim, os três
cenários foram verificados: dois na rodada de135,292s e um no reteste. Não se
apresenta a rodada inicial como aprovação integral.

Logs: `scriptorium-study-depth-native-ui-final.log` e
`scriptorium-study-depth-native-case-retest.log`, em LOCALAPPDATA/Temp.
Screenshots Android de caso e síntese e screenshots web foram inspecionados.

## Limites

- A revisão automatizada verifica cobertura, identidade, integridade e fluxos;
  não certifica a qualidade acadêmica de cada tese nem a interpretação do leitor.
- Curadoria audiovisual e reprocessamento documental não fazem parte da mudança.
- Formação geral e Conhecer para amar continuam com consumidores Android; temas,
  guias e Gênesis também usam o conteúdo ampliado no web.
- Na rodada de QA, o celular estava ausente; a instalação posterior está registrada abaixo.
- Sem alteração de schema, nova cópia integral de banco, PDF ou acervo.

O asset editorial contido no APK foi comparado byte a byte com o JSON gerado e
validado no projeto: idêntico. Não é necessário exportar outro pacote de acervo.

## Instalação física posterior — 25/10/2026

A pedido do usuário, APK0.6.4/code16 instalado sobre0.6.2/code14 no Samsung
SM-S906E por `adb install -r`, com retorno Success. `dumpsys package` confirmou
versão0.6.4/code16. A abertura da MainActivity retornou Status ok, COLD,1368ms.
O identificador de acervo permaneceu idêntico antes/depois:
`4c8bad603f43da83e4e232109ba78b6fe4212400e9da47d2a7d92b0ffb8aa2f4`.
Não houve desinstalação, limpeza de dados ou reimportação do pacote. Não foram
executados cenários que alteram progresso de QA no telefone pessoal.
