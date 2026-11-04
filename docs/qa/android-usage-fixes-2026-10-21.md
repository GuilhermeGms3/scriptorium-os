# Android 0.4.1 — correções de uso

Versão 0.4.1 / versionCode 7. Escopo: busca, navegação, leitor, comentários e menu Android.
Desktop, pipeline, schema pessoal e pacote de livros não foram alterados.

## Entrega

- Home centralizado na largura da tela; Menu com seis opções em janela central e fundo escurecido.
- Busca compacta, campo arredondado e centralizado, botão Pesquisar central e resultados no
  espaço restante. Categorias Escrituras, Biblioteca, Exegese, Hermenêutica, Pesquisa acadêmica
  e Na web. A escolha de edição redundante foi retirada da busca e do cabeçalho do leitor.
- Escrituras e páginas são consultas separadas. Exegese/Hermenêutica usam tipos existentes de
  associações com evidência na página; não inventam classificação para todo o conteúdo do PDF.
  A consulta classifica comentários uma vez, depois usa a chave dos spans, sem correlação por página.
- Destinos externos são consumidos uma vez, sobrepondo a passagem restaurada. Uma revisão de
  navegação reinicia o posicionamento inclusive ao abrir outro versículo do mesmo capítulo.
  Capítulos não reutilizam o resultado assíncrono anterior durante o primeiro posicionamento.
- Voltar do Android na passagem abre a escolha de livros; rótulo explícito Voltar pra escolha.
  Livros em retângulos de uma coluna com emblemas locais temáticos, sem downloads de imagens.
- Abas Leitura/Interlinear/Comparação no leitor, com a referência em foco e alinhamentos reais
  por unidade. Tokens têm superfície, transliteração, lema e morfologia legível; JSON não é UI.
  Códigos originais permanecem no detalhe da palavra. Não há alinhamento lexical português fabricado.
- Ações por versículo aparecem ao segurar dois segundos: Anotar, Favoritar, Interlinear e Copiar.
  A rolagem cancela o gesto; toque simples também pode indicar o versículo ao painel.
- Âncora da leitura ignora uma pequena sobra do versículo anterior. O dock coloca referência,
  Filtrar central e recolhimento em uma linha. Filtros começam recolhidos; não há contagem redundante.
- Comentários usam serifa de leitura e tamanho limitado na janela; quebras duras de PDF são
  recompostas somente na apresentação. Original, offsets da evidência e PDF permanecem íntegros.

## Verificação executada

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
.\android\gradlew.bat -p android :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug
```

- Build aprovado com JDK21/SDK36; 49 testes JVM em sete classes, sem falhas.
- Android lint: 0 erros e 22 avisos. Sem atualização de dependências.
- Seis cenários nativos em `ReadingUiTest`, 103,058s, aprovados: curso e rascunho, busca após
  restauração e novo destino no mesmo capítulo, fonte/filtros/Biblioteca, aula e leitura real,
  gesto de dois segundos, persistência de aparência/dock. Busca verificou resultados com mais
  de 30% da altura física e Home no centro. Interlinear verificou ausência de JSON na tela.
- Três testes sobre o pacote real em `ReadingExperienceTest`, 11,091s, aprovados. Confirmados
  endereços/ranges, textos antigos, separação Escrituras/Biblioteca/assuntos, 467 comentários
  preservados em Gênesis1 e 14 leituras reais na aula Trindade.
- Medida final no emulador: Exegese/Deus 40 páginas em4479ms; Hermenêutica/Deus 0 páginas
  em923ms. Zero nessa consulta reflete as classificações do pacote, não indisponibilidade de todo
  o assunto. Não equivale a uma classificação temática completa do acervo.
- QA isolado no AVD `Scriptorium_Feedback_QA`, API37, porta5562, 1080×2400/densidade420.
  Capturas de busca, livros, menu, fonte e interlinear inspecionadas visualmente.
- Atualização por `adb install -r`: hash do banco pessoal idêntico antes/depois. O ID de conteúdo
  continua o mesmo. Testes de curso escrevem somente progresso de QA nesse emulador.
- `git diff --check` aprovado. Nenhum PDF, SQLite ou modelo novo entra no APK/Git.

## Limites

- Celular físico ausente na conexão USB nesta execução: APK preparado, não instalado no aparelho.
- Serviços externos/OpenAlex e inferência semântica não foram revalidados; suas implementações
  não mudaram. Os filtros de assunto dependem das classificações efetivamente exportadas.
- Emblemas são ilustrações vetoriais/pictogramas do sistema, não um novo pacote de fotografias.
- Reinstalar por cima; não desinstalar nem limpar dados. Esta entrega não requer outro acervo.
