# Referências na seleção de livros — Android 0.6.11

## Correção

O campo Encontrar livro ou texto usava somente substring do título. Acrescentar
capítulo eliminava o livro dos resultados; o parser também exigia pontuação para
separar capítulo de versículo. A seleção agora utiliza nomes/aliases do catálogo
instalado e oferece Abrir passagem, sem substituir a escolha de capítulos.

- Aceita capítulo, versículo por espaço, dois-pontos, ponto ou vírgula e intervalo.
- Tolera um erro em nomes a partir de quatro caracteres, até dois a partir de oito,
  incluindo transposição de letras. Correspondência exata tem prioridade; empate
  não abre um livro arbitrário. Abreviações curtas e números de livros são preservados.
- Conserva Jo/João, Jó e Jn/Jonas como escolhas distintas.
- Consulta a edição real de cada livro no catálogo, em IO, com cancelamento e atraso
  de 180 ms; resultados de outra consulta não podem ser acionados após editar o campo.
- Confere capítulo e existência do versículo/intervalo no corpus. Salmos 67:15 é
  rejeitado sem esconder o livro; Salmos 67 abre normalmente.
- O interpretador compartilhado do Android também atende Busca/Escrituras.
- Sem migrations, dependências novas, alteração do acervo ou do indicador mobile.

## Evidência

Com JAVA_HOME no JBR do Android Studio e ANDROID_HOME no SDK local:

```powershell
./android/gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest
```

Build aprovado, 76 testes JVM sem falhas, lint com 0 erros e 49 avisos.
Os casos compartilhados antigos de referências com a web continuam passando.
O APK de testes foi recompilado após ajustar os seletores de acessibilidade.

No Pixel_8/emulator-5554 com acervo real já instalado, dois testes instrumentados
passaram com fullQa=true e uiQa=true:

- ReadingExperienceTest.typedReadingReferencesUseRealInstalledVersesAndRejectMissingAddresses:
  Romanos 12:2 por três grafias, texto real, versículos/capítulos ausentes e Salmos 67.
- ReadingUiTest.readingCatalogueFindsAndOpensTypedReferencesWithoutLosingTheBook:
  pesquisa de capítulo, erro romnaos, abertura e indicador ativo no versículo 2,
  aviso de endereço inexistente, livro mantido e abertura de Salmos 67.

Resultado final: OK (2 tests), 19,763 s. A captura da correspondência foi inspecionada.
Nas primeiras rodadas, o teste de dados foi ignorado por falta da flag fullQa e o
harness de UI procurava o indicador sem o prefixo Navegar, depois clicava no campo
cujo valor era igual ao título do resultado. Corrigidos os seletores/flags e repetida
integralmente a rodada; os resultados finais acima não contam cenários ignorados.

Logs locais: %TEMP%/android-reference-build.log e android-reference-device.log.
Capturas no emulador: feedback-041-reading-reference-{match,invalid}.png.
APK: android/app/build/outputs/apk/debug/app-debug.apk, versão 0.6.11/code23.
SHA-256: af90dc08889f641214838a098b2838330d59b089c0ac6534c5f347e9125d1045.

## Limites

Nenhum celular físico está conectado: instalação confirmada somente no emulador.
Atualiza apenas o APK, sem reimportar livros. Desktop/Docker não foram alterados;
validação TypeScript/build web não se aplica aos arquivos Kotlin modificados.
Tolerância limitada não equivale a corrigir qualquer nome ou adivinhar ambiguidades.
