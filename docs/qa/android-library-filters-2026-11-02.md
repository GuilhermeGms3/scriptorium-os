# Biblioteca Android: filtros e rolagem — 02/11/2026

## Entrega

Android **0.6.14 / code26**. Sem novas dependências, alterações de schema ou mudanças
no acervo canônico. Nenhuma instalação ou operação no celular físico nesta entrega.

- Filtros combináveis por tipo, assunto relacionado e idioma; A–Z/Z–A e contador.
- Busca sem distinção de acentos; limpar filtros e estado vazio explícito.
- Tipos sugeridos pelo título, sem alterar classificação editorial. Assuntos vêm
  exclusivamente de leituras documentais vinculadas ao catálogo de estudos instalado.
  Obras sem assuntos continuam na coleção geral; não foi feita nova classificação
  semântica dos livros. Pacotes antigos sem tabelas documentais mantêm os demais filtros.
- Filtros e posição da grade definidos antes da abertura do leitor: voltar preserva
  a estante. Mudar coleção, busca ou filtros retorna ao começo dos resultados.
- Removido `revealSection` apenas dos cartões virtualizados. Ele reiniciava alpha
  zero e atraso a cada recomposição de entrada na área visível, deixando livros
  momentaneamente invisíveis durante a rolagem. Animações das outras telas preservadas.
- Cache de capas em memória limitado a 24 MiB, por checksum; sem reciclar bitmaps
  ainda exibidos. Cache JPEG existente preservado, com quatro locks independentes
  em vez de serializar toda renderização. Marcador de capa ocupa o espaço enquanto
  o bitmap carrega; títulos não aguardam a imagem.

## Validações

Com JBR do Android Studio e SDK local, em `android`:

```powershell
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug --console=plain
```

**Build aprovado, 89 testes JVM, zero falhas/erros. Lint: zero erros e 49 avisos**,
mesmo total anterior. Cinco testes novos cobrem combinação de facetas, busca com
acentos, metadados ausentes, ordenação, preservação de registros e tipos distintos
de obras como Confissões de Agostinho e Confissão de Augsburgo.

Dois testes instrumentados executados exclusivamente no **Pixel 8 emulado**, serial
`emulator-5554`, usando `uiQa=true` e seleção explícita dos métodos:

- `libraryFiltersCombineAndShelfStaysPresentAfterFastScroll`: coleção real instalada,
  seleção de dicionários, busca de um título existente, limpeza, quatro rolagens
  rápidas, abrir livro e voltar para os mesmos cartões.
- `libraryCoverUsesTheSameBoundedBitmapWithoutRewritingDiskCache`: PDF temporário
  gerado no teste, PdfRenderer real, miniatura de 480 px e identidade do bitmap
  reutilizado sem reescrever o JPEG. Fixture removida ao terminar.

**2/2 passaram.** O emulador contém um pacote anterior de 57 livros, com assuntos
documentais em 23 obras; isso não substitui QA do pacote atual de 65 documentos no
celular físico. O primeiro teste foi ajustado para selecionar um título realmente
instalado, em vez de exigir Anchor nesse pacote antigo. A compilação do teste de PDF
foi corrigida para fechar PdfDocument explicitamente; a execução final acima passou.

Telas de filtros e de rolagem inspecionadas visualmente. Evidências locais em
`data/mobile-ui-qa/library-filter-dialog-0614.png`, `library-filters-0614.png` e
`library-fast-scroll-0614.png`; não são dados de produção nem conteúdo novo do acervo.
O emulador foi encerrado sem salvar snapshot novo. Não houve benchmark de FPS ou
medição de fluidez no Samsung nesta entrega.

## Distribuição

APK do kit existente `Desktop/Scriptorium-Acervo-2026-11-02/Scriptorium.apk` substituído
por 0.6.14; `delivery.json` e LEIA-ME atualizados. O pacote de acervo foi reutilizado,
sem novo ZIP, backup ou nova exportação de vários gigabytes.

SHA-256 do APK: `30c9cd7009eab7269f939936e9f3f15e019bb6dc8a6d884b312cccc8ebfd3561`.

A proposta de [piloto para igreja](../architecture/church-pilot-distribution.md)
é somente documentação. Nenhum serviço Firebase, login, bloqueio ou download remoto
foi adicionado ao aplicativo. O APK atual permanece destinado ao uso privado.
