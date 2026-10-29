# Android0.6.1 — leitura, idiomas e autoria de reflexões

## Escopo

Continuação da missão Áudio Multiplataforma, sem declarar produção cinematográfica concluída.
Mantidos o MediaSessionService, o tradutor local, o leitor documental e os bancos existentes.
Não foi gerado outro kit completo, backup ou cópia de PDFs. Somente APK de atualização.

## Mudanças

- Tradução em versículos, comentários expandidos e fonte contextual. Metadados da edição
  são consultados uma vez por capítulo, não uma vez por versículo.
- Trechos sem idioma declarado usam ML Kit Language ID17.0.6 embarcado e local. Português
  oculta a ação; inglês/espanhol oferecem tradução; incerteza permite seleção manual.
  Texto muito curto/misto continua sujeito a identificação incerta. O tradutor não suporta copta.
- Catálogo mostra contagens e sobreposição entre não canônico/apócrifo; volumes gnósticos
  aparecem no filtro Esotérico. Isso é descoberta de conteúdo, não classificação canônica universal.
- Volumes abrem o leitor integral, em vez de somente modal. Tomé copta oferece volumes reais
  e uma consulta restrita ao início espanhol localizado em Nag Hammadi. Conferência somente
  leitura no acervo desktop encontrou volumeII, índice71 (página física72), início dos ditos.
  Não há alinhamento automático nem tradução copta→português inventada.
- Aba Leitor removida; fila preservada em Início. Reflexões possui rascunho, revisão explícita,
  autoria manual, estilo editorial, coleção separada, edição e ambientação por episódio.
- Marrom recebe containers quentes; Cinza conserva acentos documentais acromáticos.
  Claro e Preto preservados.

## Verificação

Comandos:

```powershell
cd android
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug --console=plain
adb -s emulator-5554 shell am instrument -w -e audioQa true -e audioUiQa true -e audioEditorialQa true -e class org.scriptorium.app.AudioPlaybackTest,org.scriptorium.app.AudioUiTest,org.scriptorium.app.AudioEditorialTest org.scriptorium.app.test/androidx.test.runner.AndroidJUnitRunner
```

Primeira rodada:66testes JVM/0falhas;4instrumentados/0falhas em16,855s. Lint0erros/46avisos.
Captura nativa de Ambiente inspecionada: navegação Início/Reflexões/Voz/Ambiente visível,
sem Leitor. Testes editoriais usam preferências isoladas, removidas ao terminar, e comprovam
retenção após40leituras, edição sem duplicação, persistência e remoção. Identificação de
português/inglês/espanhol exercitada com modelo real, não substituto de teste.

O lint sofreu uma falha interna de PSI enquanto o arquivo era editado durante a análise;
reexecução com fontes estáveis passou sem desabilitar regras. A consulta Thomas posterior
exige repetição do gate final registrada abaixo antes da entrega.

### Gate final

Build do aplicativo/testes, compilação Kotlin,66JVM/0falhas e lint0erros/46avisos repetidos
com todas as alterações finais. Cinco testes instrumentados passaram em29,105s, incluindo
o teste existente de tradução ampliado para inglês **e espanhol**. Ambos produziram
`O livro está na mesa.` a partir dos respectivos originais, com download real dos modelos.
Também passaram narração de reflexão revisada, recusa da não revisada e restauração da
trilha/volume por episódio. Capturas de Reflexões e Ambiente inspecionadas; `git diff --check`
sem erros. Não foi executado build web porque nenhum código TypeScript/React foi alterado.

Identificação segue a [API oficial local do ML Kit](https://developers.google.com/ml-kit/language/identification/android).
As frases curtas de QA não comprovam qualidade acadêmica de toda tradução teológica.

## Limites

Emulador tem corpus real reduzido e não recebeu os57PDFs privados. Não se afirma QA visual
de cada volume, filtro ou comentário privado. O telefone não estava conectado nesta rodada;
nenhuma atualização nele foi confirmada. Não houve teste de Bluetooth/ligação telefônica,
serviço neural externo, roteiro por LLM, exportação ou intercâmbio de reflexões.
