# QA — Áudio Android0.6.0 — 23/10/2026

## Ambiente e escopo

Fase1 do [Áudio Android](../architecture/audio-android.md). JDK21, AGP9.2.1, Kotlin2.2.10,
SDK36, Gradle9.4.1 e Media3 1.9.4. Nenhum upgrade geral de ferramentas/frameworks.
Emulador Pixel_8 existente, sem janela, com pacote de teste de14.169.346bytes e Bíblia Livre
real. Não recebeu PDFs privados nem notas do usuário. O aparelho físico deixou de aparecer
no ADB na primeira etapa; após reconexão, a instalação e o QA físico foram executados
na seção complementar abaixo.

## Comandos e resultados

```powershell
cd android
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug --console=plain
```

- Compilação do aplicativo e APK instrumentado aprovadas.
- 64 testes JVM passaram,0falhas; seis novos testes de literalidade/Unicode, limites,
  edição/esquema, identidade, alteração do texto e versão do contrato.
- Lint Android:0erros/42avisos. Há avisos novos de preferência KTX e versões disponíveis;
  não foram suprimidos nem escondidos em baseline. Primeiro lint apontou quatro usos de
  constantes antigas de erro Media3; corrigidos para `SessionError` e gate repetido.
- `npx vitest run src/lib/audio/audio-engine.test.ts src/lib/audio/scripture-narration.test.ts
src/lib/audio/ambience.test.ts`:48testes/3arquivos passaram. Nenhuma alteração no motor web.
- `npm run typecheck`:aprovado. Não foi necessário novo build web: nenhum TS/TSX foi alterado.

## Reprodução real e UI nativa

```powershell
adb -s emulator-5554 shell am instrument -w -e audioQa true -e audioUiQa true -e screenOffQa true -e class org.scriptorium.app.AudioPlaybackTest,org.scriptorium.app.AudioUiTest org.scriptorium.app.test/androidx.test.runner.AndroidJUnitRunner
```

Os dois testes instrumentados são explicitamente opt-in e usam código real, não providers
de voz/player falsos. O teste de reprodução:

- Lê texto real de Gênesis1, prepara WAV com TTS local e reproduz via Media3.
- Importa WAV técnico gerado temporariamente; confere deduplicação e organização.
  Esse sinal não é música distribuída nem episódio do catálogo. É removido ao finalizar.
- Confere volumes, dois canais tocando e narração após voltar à tela inicial do Android.
- Confere sessão registrada, reprodução com tela desligada, perda de foco transitória com
  pausa de ambos os canais e retomada pelo Media3; comando de mídia do sistema pausa o player.
- Confere posição parada durante pausa, velocidade, Música → Voz, limpeza da fila ao encerrar,
  reuse do cache sem modificar WAVs e erro recuperável de idioma indisponível.

O teste de UI usa a árvore de acessibilidade nativa: Menu → Áudio, abas Leitor/Voz/Ambiente,
campos e botão de importação, retorno pela navegação. Não é apenas uma captura estática.
Dois testes passaram juntos no emulador (24,485s na rodada final, incluindo proteção contra
retomada de voz pausada manualmente ao voltar do modo Música).
Uma repetição adicional de síntese, com outro trecho de Gênesis e `Active default network:
none` confirmado antes de começar, também passou (13,516s). Wi-Fi do emulador foi restaurado;
não foram alteradas as conexões ou configurações do celular físico.

Captura da UI em tema escuro revisada. Um aviso residual veio da remoção direta da faixa
de QA; a limpeza do teste passou a usar o comando do serviço para liberar o canal antes de
excluir a cópia. A interface também oferece fechamento explícito de avisos recuperáveis.

Uma primeira execução de reprodução retornou `ERROR_UNKNOWN`; foi acrescentado diagnóstico
com mensagem do serviço. Reexecuções posteriores passaram, inclusive com foco/tela desligada.
A causa dessa primeira falha de inicialização não foi comprovada; não atribuir ao conteúdo.
Nenhuma voz ausente é substituída silenciosamente por outro idioma ou um provedor remoto.

APK0.6.0/code12 gerado em `android/app/build/outputs/apk/debug/app-debug.apk`, assinatura
debug conferida por `apksigner verify --print-certs`. SHA-256:
`0c58348e0ef122425398cfe1d42b8cc0d3ffa18b8d0d1453e29cd0ef00927787`
(build corrigida para códigos de idioma Samsung).
Esse APK não contém os PDFs e atualiza o código sem substituir o pacote de acervo.

## Limitações reais

- Sem avaliação humana da naturalidade/inteligibilidade ou medição acústica de ganho.
- Sem Bluetooth/fones reais, chamada telefônica real, outros OEMs ou tela bloqueada com PIN.
  Tela desligada do emulador não prova esses casos; o QA físico complementar não bloqueou
  a tela nem mudou configurações de rede/voz do usuário.
- Importação pelo código real e navegação até SAF verificadas; não foi percorrida manualmente
  a escolha de cada formato em provedores de arquivos diferentes. Codec testado positivamente:WAV.
- Cancelamento/timeouts implementados; não há teste de interrupção de longa síntese por morte
  do processo ou lotação física do disco. O estado busy é recuperado ao recriar o serviço.
- Não há provedor neural externo, geração de roteiro, Reflexões, ducking, mixagem/exportação,
  transporte de projetos ou WorkManager editorial nesta fase.
- Dados de áudio/histórico são locais; não foram incorporados ao backup pessoal existente.
- Não foram criados novos backups completos, mudado Docker ou acessado/migrado o workspace
  canônico dos livros para este QA. Nenhuma chamada externa paga foi executada.

## Arquivos relevantes

- Motor/adapters: `audio/AudioPolicy.kt`, `AudioLibrary.kt`, `NativeNarrator.kt`,
  `ScriptoriumAudioService.kt` e `AudioClient.kt` dentro do pacote Android.
- Interface: `ui/AudioScreen.kt`, shell/MainActivity/AppModel, ReaderScreen/ReaderChapter,
  SourceScreens e StudyPages. Novo método de metadados de direitos em MobileRepository.
- Manifest/permissões e dependências em `android/app/build.gradle.kts`.
- Testes: `audio/AudioPolicyTest.kt`, `AudioPlaybackTest.kt` e `AudioUiTest.kt`.

Próxima fase: provedor neural real, autenticado/configurado, com consentimento e orçamento
explícitos antes de envio; depois, roteiro aprovado e projetos Reflexões multiplataforma.

## Complemento — Samsung físico, após reconexão

- APK0.6.0/code12 instalado por `adb install -r`, sem desinstalar nem reenviar conteúdo.
- Primeira rodada física: UI passou, reprodução falhou ao comparar `por` com `pt`.
  O catálogo real contém `pt-BR-SMTf00`, mas o Samsung expõe locale `por-x-lvariant-f00`;
  espanhol aparece como `spa`. Não faltavam dados de voz, e não foi instalado outro idioma.
- Corrigida normalização ISO-639-2/ISO-639-1 por catálogo de Locale, com região preservada
  quando disponível no identificador da voz. Grego antigo `grc` não é equiparado a `el`.
- Dois testes JVM de regressão adicionados; total atual **66 testes JVM/0falhas**.
  `assembleDebug`, `assembleDebugAndroidTest` e `lintDebug` repetidos:aprovados,
  lint0erros/42avisos. Não mudou nenhuma dependência ou configuração do sistema.
- `am instrument -w -e audioQa true -e audioUiQa true -e class
org.scriptorium.app.AudioPlaybackTest,org.scriptorium.app.AudioUiTest
org.scriptorium.app.test/androidx.test.runner.AndroidJUnitRunner` no Samsung:
  **2 testes passaram em17,046s**, com voz local real e WAV técnico temporário.
- Confirmados música + narração, segundo plano, foco transitório, comando de mídia,
  velocidade, pausa, modo musical, cache/retomada, erro de idioma e navegação nativa.
  `screenOffQa` não foi enviado ao aparelho: não bloquear a tela do usuário durante esse QA.
- Nove tabelas pessoais idênticas por contagem/hash antes/depois; FKs0. Notas, grupos,
  pastas, relações, progresso, marcações, fontes salvas e traduções preservados.
  Só fingerprints foram gravados no PC; nenhum novo backup de banco ou acervo.
- Reinício preservou acervo ativo `4c8bad60…aa2f4`; aplicativo0.6.0 reaberto ao finalizar.
