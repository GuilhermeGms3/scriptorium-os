# Scriptorium Áudio Android — fase 1

Implementação incremental da missão Áudio Multiplataforma e Reflexões, em23/10/2026.
Android0.6.1/code13. Não substitui o motor web nem o armazenamento de livros/notas.

## O que funciona

- Menu → Áudio: Início, Reflexões, Voz e Ambiente; mini player entre módulos. A fila fica no Início.
- Escrituras: capítulo, intervalo ou unidade/versículo real da edição; fila para capítulos
  sucessivos, sem carregar a Bíblia inteira. Na ação de versículo, Ouvir ou Adicionar à fila.
- Livros/páginas e etapas de aulas/guias: ouvir o texto ou selecionar um intervalo UTF-16.
  A seleção não edita o original. Texto pessoal pode ser escrito como roteiro em Reflexões.
- Player: pausa/retomada, anterior/próximo segmento, velocidade0,5–2×, posição em segundos
  dentro do arquivo atual e retorno à origem bíblica. A timeline não é a duração total do capítulo.
- Histórico de30leituras, até20favoritos preservados dentro desse limite, até20perfis de voz;
  fila e posição persistidas. Nenhum autoplay após reiniciar o serviço/aplicativo.
- Vozes locais reais, filtráveis por idioma; prévia real, erro recuperável se idioma ausente.
  Códigos ISO-639-2 do Samsung (`por`, `spa`) são comparados aos equivalentes `pt`/`es`,
  sem equiparar idiomas diferentes ou trocar grego antigo por grego moderno.
- Importação SAF, cópia privada, hash/deduplicação, nome/categoria, remoção confirmada,
  volume musical independente, repetição e três modos: Voz, Voz + Música, Música.
- Arquivos preparados continuam tocando fora da Activity via serviço de mídia. Comandos
  de transporte pelo Android; o canal musical acompanha pausa e perda de foco da narração.

## Um único controlador por plataforma

O desktop preserva `AudioEngine`, `NativeSpeechProvider` e `AmbienceController` existentes.
O Android usa `ScriptoriumAudioService : MediaSessionService` e uma `MediaSession`:

```text
Leitor / Livro / Estudo / Áudio
                ↓
           AudioClient (MediaController, sem player próprio)
                ↓
       ScriptoriumAudioService
          ├─ NativeNarrator → síntese local em arquivos privados
          ├─ ExoPlayer principal → narração OU música isolada; único dono do foco
          └─ ExoPlayer interno → ambiente, sem solicitar foco
```

Media3 ExoPlayer/session1.9.4 foi adicionado porque não havia mecanismo nativo equivalente
no projeto. Versão estável deliberadamente fixada; não foi feita atualização geral de libs.
O serviço é quem mantém arquivos, fila, foco e sessão/notificação. A Activity apenas controla.
Não existem dois serviços competindo por foco nem reprodução via WebView.

O Android usa TTS nativo como adaptador de síntese, **não como um segundo player**.
`synthesizeToFile` termina por callback ou falha/timeout; só arquivos concluídos são entregues
ao Media3. Cancelar invalida o trabalho pendente e remove o `.part`. Isso permite seek real,
controles de mídia e reprodução com a tela desligada, sem inventar offsets temporais.
Não é o provedor neural expressivo solicitado para as Reflexões.

Referências oficiais:
[background/MediaSessionService](https://developer.android.com/media/media3/session/background-playback),
[comandos de sessão](https://developer.android.com/media/media3/session/control-playback),
[TTS/síntese para arquivo](https://developer.android.com/reference/android/speech/tts/TextToSpeech),
[Media3/releases](https://developer.android.com/jetpack/androidx/releases/media3).

## Contratos e identidade

`NarrationEntry` é versionado e mantém texto literal, idioma, título, origem e SHA-256.
Origem bíblica preserva endereço codificado, edição, obra, esquema, IDs reais das unidades e
metadados da edição. Origem documental conserva documento, página, checksum e seleção.
O título ou a referência não são inseridos silenciosamente como fala.

O contrato é conceitualmente equivalente ao áudio web (origem, texto, segmentos, identidade
e progresso), mas **não é um pacote de intercâmbio web/Android**. Não exportar esse JSON
como se já fosse um projeto multiplataforma de Reflexões. Isso pertence à fase editorial.

Texto alterado não herda progresso do texto anterior. Cache de voz considera texto falado,
idioma, voz, mecanismo e versão do pacote TTS. Mudar velocidade usa o player sem gerar voz
novamente. Ao mudar voz, retomar usa o segmento e só conserva milissegundos se o fingerprint
do arquivo for idêntico. Espaços isolados não viram requisições vazias de síntese.

## Armazenamento e limites

- `files/audio/music`: cópias privadas de arquivos importados, identificadas por hash.
- `files/audio/speech`: WAVs nativos preparados; limite200MiB, limpeza explícita após parar.
- SharedPreferences `scriptorium-audio-v1`: metadados, textos privados do histórico, fila,
  progressos, favoritos, perfis e preferências. Erros não substituem o banco de livros/notas.
- Música:50MiB/arquivo, duas horas,100faixas/500MiB; metadados verificados no Android.
  MP3/WAV/M4A/AAC/FLAC/OGG dependem do decoder real. Uma falha posterior é recuperável.
- Texto:30.000caracteres/leitura; segmentos literais até600UTF-16; fila até300segmentos.
  Preparação é serial e cancelável, com timeout45s/segmento. Texto/arquivos já prontos são
  preservados diante de falhas; fila é alterada apenas após preparar a leitura.
- IO de cópia/hash/metadados musicais e publicação de WAV ocorre fora da thread principal.
  A preparação precisa permanecer no processo do serviço; retomada de uma síntese interrompida
  requer repetir a ação, reutilizando os segmentos já prontos. Não há WorkManager editorial ainda.

Não há outro SQLite de conhecimento, migration, cópia de PDFs ou novo backup completo.
Esses arquivos e ajustes são **locais do Android** e não entram automaticamente nos patches
do acervo nem no backup de notas. Exportação de áudio/projetos ainda não está implementada.
Desinstalar ou limpar dados do app remove os áudios/histórico, assim como outros dados privados.

## Modos e foco

- Voz: player principal narra; música parada.
- Voz + Música: canal musical acompanha o estado real `isPlaying` e supressão de foco do principal.
- Música: player principal assume a faixa, com sessão/notificação. Fila/posição de voz ficam
  guardadas para voltar. Trocar modo preserva a intenção de pausa do usuário.
- Trocar trilha em modo misto não toca no player da narração.
- Encerrar pausa/cancela e retira a fila do player; histórico e arquivos preparados permanecem.
- Uma chamada/perda transitória de foco é tratada pelo Media3. Validação com ligação telefônica
  e dispositivos Bluetooth reais continua necessária; não é comprovada por testes de emulador.

## Privacidade e segurança

Nenhum texto é enviado a uma API externa; não há chave, chamada paga, clonagem ou publicação.
Só vozes declaradas locais pelo mecanismo Android são selecionadas. A disponibilidade depende
dos dados de voz instalados no SO; baixar/configurar esses dados é uma ação separada do usuário.
Direitos da edição/fonte são preservados para uso pessoal; importar música não concede licença
de distribuir ou exportar uma composição.

A sessão permite comandos de transporte a controladores confiáveis. Comandos privados são
restritos ao pacote/UID verificado pelo Media3. Outros controladores não podem trocar os itens
nem injetar URLs. Fila restaurada aceita somente arquivos canônicos dentro da pasta privada
de áudio. Não há endpoint administrativo, serviço HTTP novo ou credencial dentro do APK.

## Missão completa: próximas fases, ainda não entregues

### Incremento editorial local em0.6.1

Reflexões Android possui autoria manual (tema/série, estilo editorial e roteiro), rascunho
persistente, aprovação explícita antes de salvar/narrar, edição, remoção confirmada e retomada
com o player existente. A música e seu volume são preservados por episódio; faixa removida
resulta em somente voz. O estilo é metadado editorial, não uma capacidade expressiva do TTS.
A duração apresentada é estimada por palavras; a timeline continua sendo a do segmento real.

A coleção usa a chave `reflections` nas mesmas preferências, separada do histórico rotativo:
até100episódios/4MiB de JSON. `projectId` estável permite substituir um roteiro editado sem
duplicar o projeto; a identidade de áudio muda quando texto/parâmetros mudam. Não há migração
de livros, novo banco ou backup pesado. Desinstalar/limpar dados elimina a coleção.

Isso **não conclui as fases2–5**: faltam provedor neural, roteiro por LLM, verificação automática
de citações, direção temporal por segmento, desktop, intercâmbio de projetos e mix/export.
A marcação de revisão atual é uma declaração do usuário, não auditoria automática de fontes.
Não foram configuradas credenciais nem feitas chamadas pagas.

1. **Fase 2 — Provedor neural:** avaliar e integrar um provedor, backend autenticado, segredo
   fora de APK/frontend, consentimento por conteúdo, estimativa de consumo, limites, prévia,
   cache e cancelamento. Não houve chamada externa paga nem configuração de credenciais.
2. **Fase 3 — Reflexões desktop:** roteiro separado do TTS, fontes verificáveis, aprovação
   editorial, segmentos com direção, biblioteca e persistência de projetos.
3. **Fase 4 — Reflexões Android:** mesmo contrato versionado, fluxo nativo, transporte explícito
   de projeto/arquivos e reprodução offline. Sem promessa de sincronização automática.
4. **Fase 5 — Produção:** timeline completa, ducking baseado na posição real, fades, regeneração
   parcial, mixagem/exportação e tratamento dos direitos de cada artefato.

As experiências cinematográficas de criação/voz neural do pedido não estão concluídas com
esta fase1. Não foram adicionados botões que fingem gerar roteiro ou narrador expressivo.
