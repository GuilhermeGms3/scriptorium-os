# Android 0.6.2 — leitura de livros e catálogos leves

## Mudança

A Biblioteca apresentava texto extraído com quebras físicas de PDF e vários controles
acima da página. A estante também renderizava miniaturas de500px repetidamente, sem cache.
A aba Leitura restaurava o último capítulo ao abrir, mesmo quando o usuário queria apenas
escolher um livro. A solicitação foi confirmada para Biblioteca e Leitura/Escrituras.

`BookReader` separa o leitor da estante. Cabeçalho com título/voltar/opções e rodapé com
página anterior, contador/salto e próxima página. O conteúdo ocupa a área central.
PDF original é a apresentação inicial quando disponível; zoom de1× a4× e deslocamento
por toque. Renderização de uma página por vez, largura1600px, bitmap limitado a1800×4000.
Recursos nativos `PdfRenderer`, sem nova dependência ou serviço externo.

Texto ajustado usa `readingParagraphs` para recompor linhas, fonte e tamanho existentes,
seleção e rolagem. O trecho de uma citação é mostrado separadamente quando há offsets
válidos; offsets e texto bruto não são regravados. Índice, áudio, tradução e anotação
continuam disponíveis na janela Leitura. Páginas sem extração podem ser lidas no PDF;
sem PDF, a leitura ajustada permanece disponível. Erros de OCR e colunas intercaladas
não são corrigidos semanticamente: PDF original preserva a diagramação real.

## Carregamento e persistência

- Estante: consulta de documentos/metadados e primeira página para gerar capa de240px,
  somente em itens compostos da lista preguiçosa. JPEG em `cache/library-covers-v1`,
  chave pelo SHA256 do PDF e escrita atômica. Reutilizações decodificam a miniatura,
  sem reabrir/renderizar o PDF e sem consultar texto de páginas. PDF ausente/inválido
  na geração de capa recebe emblema de fallback; o título continua acessível.
- Livro: só monta o leitor depois da escolha. PDF carrega a página atual; extração só
  é consultada ao escolher Texto ajustado ou abrir ferramentas de texto. Não carrega
  todas as páginas do livro. Recursos PDF são fechados depois da renderização.
- Leitura/Escrituras: estado inicial sem passagem; o catálogo consulta apenas metadados.
  Última referência é decodificada das preferências para o botão Continuar leitura.
  Toque explícito nas abas Leitura/Biblioteca cria uma entrada de catálogo nova e limpa
  solicitações externas antigas. Links de Busca/Estudos/
  Início/Áudio conservam o fluxo de abertura direta já existente.
- Página por livro em `ReadingPreferences`, separada das notas. Ao reabrir o livro,
  retoma a posição válida dentro da contagem atual. Não integra o backup pessoal de notas.
- Sem mudança de schema, corpus, PDFs, desktop ou pipeline. Sem pacote de acervo novo.

## Verificação

- `./android/gradlew.bat -p android :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug`:
  build aprovado;66 testes JVM aprovados; lint sem erros e48 avisos (incluindo recomendações KTX).
- `git diff --check`: aprovado. Typecheck/web/pipeline não executados: não houve alteração nessas áreas.
- Emulador isolado com acervo real, leitura sem rede: leitor de livro/capa/cache/zoom/
  texto/fonte/salto/retomada; catálogo bíblico e retomada explícita; busca/interlinear/
  comparação; comentários/filtros/Biblioteca; vínculos de aulas; apócrifos; aparência/dock.
  Seis cenários passaram na rodada conjunta; o teste do catálogo foi ajustado para verificar
  o corpo do versículo (o modo em linha não mostra o rótulo usado na primeira asserção)
  e passou no reteste de16,103s. Sete cenários cobertos no APK final.
- Primeiras tentativas foram interrompidas por ANR de System UI/Pixel Launcher antes
  da Biblioteca. Emulador foi reiniciado com menos RAM/cores e sem atualizações de rede;
  isso não foi tratado como validação do aplicativo. A conferência visual e os testes
  posteriores foram feitos com o sistema estável.
- Inspeção visual de PDF a150%, texto ajustado, estante e catálogo de Escrituras.
- Entrega somente APK em `C:/Users/comical/Desktop/Scriptorium-Android-0.6.2`.
  SHA256: `4425b8fb9b8841993a77cf95bef0a79ab2ceb4182a42402724f8d7c3017337c5`.
- Instalado sobre a versão anterior no Samsung SM-S906E: `adb install -r` retornou
  Success; `dumpsys package` confirmou0.6.2/code14; `am start -W` retornou Status:ok.
  O acervo ativo manteve o mesmo ID antes/depois. Não foram executados testes de QA
  que escrevem progresso/notas no aparelho pessoal.
