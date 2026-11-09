# Fontes antigas e painel de comentários — Android 0.6.12

## Alterações

PrimaryReader usa um controle de tradução por leitura, em vez de um botão por
unidade. Todas as até 80 unidades carregadas entram na fila local, com publicação
progressiva e cache existente. O modo português continua ao paginar, permite
retorno ao original e repetição após falha. Identificadores, endereços, notas,
texto-fonte e traduções preparadas do PC não são reescritos.
Inglês/espanhol continuam sendo os idiomas suportados pelo ML Kit existente;
metadados desconhecidos passam pela identificação local ou escolha do idioma.
Não inclui serviço cloud nem dependência nova.

Na leitura bíblica, recortes da mesma fonte são agrupados apenas dentro do mesmo
versículo/contexto. Cartão recolhido contém título, quantidade quando maior que
um e Expandir. Expandido conserva cada corpo e seu acesso à fonte específica.
Trechos de volumes diferentes não são fundidos mesmo com títulos iguais.
Sínteses assistidas continuam identificadas ao expandir.

A paleta usa cartão neutro, texto do tema e detalhes suaves. O painel inferior
começa em 48% da área do leitor; a alça ajusta entre 25% e 75%, com ações de
acessibilidade para aumentar/diminuir. Filtros permanecem em janela; sincronização
por versículo usa o novo número de cartões agrupados, sem índices antigos.
Indicadores, desktop, contratos e bancos canônicos não foram alterados.

## Verificações

```powershell
$env:JAVA_HOME = 'C:/Program Files/Android/Android Studio/jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
./android/gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest
```

- Build e compilação Kotlin aprovados; 80 testes JVM, nenhuma falha.
- Lint: 0 erros, 49 avisos preexistentes.
- Novos testes verificam agrupamento sem perda de IDs/localizadores, limites de
  altura, fila de 80 unidades, resultados parciais e propagação de cancelamento.
- Três testes instrumentados aprovados no Pixel_8/emulator-5554:
  - groupedGenesisSourcesKeepAllInstalledComments: Gênesis 3:1, 8 recortes em 4 fontes,
    nenhuma perda. OK (1 test), 38,675 s incluindo importação do pacote de QA.
  - didacheFeedTranslatesEveryLoadedUnitWithTheRealLocalModel: 16 unidades reais do
    Didaquê traduzidas pelo ML Kit local, originais inalterados.
  - commentsPanelDragsInBothDirectionsAndAncientFeedHasOneTranslationAction:
    arrasto para cima/baixo, filtros, um botão de tradução no feed, confirmação,
    término real da tradução, retorno ao original e captura do tema claro.
    Esses dois últimos: OK (2 tests), 45,077 s, sem cenários ignorados.
- Capturas escuras/claras e do Didaquê traduzido inspecionadas visualmente.
- git diff --check aprovado.

A primeira rodada instrumental falhou porque o snapshot antigo do emulador
continha somente um recorte reduzido e não tinha Didaquê nem comentários de Gn 3.
Foi preparada uma projeção real com o exportador canônico em leitura somente,
sem PDFs e sem notas pessoais: 57 documentos, 47.707 páginas, 51.078 comentários
e duas edições. Instalada somente no emulador, por flag opt-in protegida contra
uso em dispositivo físico. Nenhum dado fictício foi acrescentado ao aplicativo.

Logs em %TEMP%: android-reader-panel-build.log, android-reader-panel-grouping.log,
android-reader-panel-device.log, android-reader-panel-export.log.
Capturas: android-grouped-panel.png, android-grouped-panel-light.png,
android-didache-feed.png. A projeção temporária grande do PC foi removida após o QA;
manifesto/relatório e logs leves permanecem. O conteúdo de teste permanece no emulador.

## Entrega e limites

APK: android/app/build/outputs/apk/debug/app-debug.apk, 0.6.12/code24.
SHA-256: 8c7ad2d21df0caeabbdfe39de4011e4f0931631fcf7202fffce29bd41a578d1c.
Atualização somente do APK; o usuário não precisa reimportar o acervo.
Celular físico ausente do ADB nesta sessão; nenhuma instalação física confirmada.

A tradução continua automática e não equivale a uma edição portuguesa revisada.
As próximas unidades são traduzidas quando carregadas, não há download/tradução
antecipada do livro inteiro. Falhas mantêm os originais e os resultados já obtidos.
QA visual em preto/claro; cinza/marrom usam os mesmos tokens e contraste adaptativo,
mas não tiveram captura instrumental própria nesta rodada. Web/Docker não se aplicam
às mudanças nativas Kotlin. Não houve schema ou migration novos.
