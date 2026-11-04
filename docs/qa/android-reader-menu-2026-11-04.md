# Leitura compacta e áudio contextual no Menu — 04/11/2026

Android **0.6.16 / code28**.

## Comportamento

- Trocar tradução aparece apenas na lista de livros. Não aparece na grade de capítulos
  nem durante leitura, comparação e interlinear.
- Removido Ouvir passagem da área da leitura. Com capítulo aberto, Menu apresenta
  Ouvir passagem e o livro/capítulo atual. Na lista de livros e em outros módulos,
  essa ação contextual não aparece.
- ReaderScreen informa a passagem ativa diretamente ao aplicativo; não se consulta
  uma referência antiga das preferências para preencher o Menu. O contexto inclui
  edição, livro, capítulo, versículo atual e eventual fim do intervalo.
- O diálogo de narração reutiliza os comandos existentes de Ouvir e À fila, com
  os mesmos campos de intervalo. Abertura de capítulo sem seleção mantém campos
  vazios para narrar o capítulo inteiro. Seleção 3–5 continua preenchendo 3–5.
- Menu tem rolagem para acomodar a ação adicional em telas menores. Tema, módulo
  Áudio, player e demais rotas preservados. Removido o fluxo assíncrono de troca
  direta durante leitura, que deixou de ter entrada de interface.

## Verificação

Com JBR do Android Studio e SDK local, em android:

```powershell
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug --console=plain
```

**Build aprovado, 93 testes JVM, zero falhas/erros. Lint: zero erros e 48 avisos.**
`git diff --check` aprovado. Sem dependências novas, migrations ou processamento do acervo.

Execução final no Pixel 8 emulado, com uiQa=true: **2/2 testes passaram**.

- `bibleEditionPickerIsVisibleAndSwitchesTheActualTextWithoutLosingThePassage`:
  tradução apenas na lista; troca para BPM; retomada da mesma passagem; recusa
  de referência indisponível; ausência dos botões na leitura e na grade de capítulos.
- `chapterNarrationAppearsOnlyInMenuAndTracksTheActiveChapter`:
  ação ausente antes de abrir capítulo; Menu identifica Gênesis 1; intervalo 3–5;
  ao abrir Gênesis 2, título correto e campos vazios para o capítulo inteiro;
  ação ausente após sair para Biblioteca.

A primeira asserção esperava 1–1 ao abrir capítulo sem seleção. Foi corrigida para
validar campos vazios, que já significavam capítulo inteiro; o caso 3–5 foi adicionado
para preservar também intervalos de estudos. A execução final acima passou.

Telas inspecionadas em `data/mobile-ui-qa/`: bible-reading-clean-0616,
chapter-audio-menu-0616, chapter-audio-range-0616 e chapter-audio-current-chapter-0616.
O fluxo e os campos foram verificados; não houve teste de qualidade de voz nem
reprodução de áudio no celular físico nesta entrega. O motor de voz não mudou.

## Entrega no aparelho

APK final instalado por cima da versão anterior no Samsung conectado. Confirmados
versionName 0.6.16 e versionCode 28. SHA-256 de personal.sqlite3 idêntico antes/depois;
ponteiro do acervo idêntico. Sem wipe, desinstalação, backup ou transferência do acervo.

O USB desconectou durante o último ajuste; após reconexão, a instalação final foi
aplicada e conferida. Kit existente Desktop/Scriptorium-Acervo-2026-11-02 recebeu
o APK e delivery.json/LEIA-ME atualizados, sem nova cópia do pacote completo.

SHA-256 do APK: `9b0b2248c210fdfec601b865141c996676fbf52c00f7c000dd4c9e70f1daa20f`.
