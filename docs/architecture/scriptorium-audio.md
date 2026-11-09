# Scriptorium Áudio — fundação funcional

Incremento22/10/2026: [Música e Ambiente](audio-ambience.md) adiciona arquivos musicais pessoais,
três modos e volumes independentes ao mesmo motor. Os resultados de21/10 abaixo são históricos;
a entrega de ambientação e seus limites estão no documento próprio.

## Escopo entregue

Fase 1 do pedido de 21/10/2026. A rota `/audio` e a entrada **Áudio** reutilizam o shell,
o tema e a navegação web responsiva. No celular web, o destino fica em **Mais**.
Não é uma atualização do aplicativo Android nem uma biblioteca editorial fictícia.

- Ouvir texto pessoal, capítulo, versículo selecionado ou intervalo de versículos.
- Manter a edição escolhida, unidades estáveis, obra, corpus, esquema, licença e atribuição.
- Player único persistente entre rotas: pausa, retomada, velocidade 0,5–2×, volume,
  segmento anterior/próximo, posição por segmento, fila de sessão e retorno ao texto.
- Catálogo real das vozes locais instaladas; idioma incompatível gera erro recuperável.
- Histórico/progresso por referência e SHA-256, sem iniciar fala ao carregar a página.

## Mapa e dependências

```text
Escrituras / Áudio → scriptureNarration → ScriptureRepository.loadEditionTextUnits
Texto pessoal     → createAudioItem → segmentos literais e identidade SHA-256
                              ↓
                 AudioEngine (um por AudioProvider no shell)
                              ↓
                NarrationProvider → NativeSpeechProvider
                              ↓
                     vozes locais do dispositivo
```

`src/lib/audio/contracts.ts` separa origem, texto original, texto falado, segmentos,
configuração, capacidades do provedor e progresso. O contrato de origem bíblica reutiliza
`TextAnchorSchema`; não cria outra identidade baseada apenas em números de versículos.
O repositório carrega somente a obra da edição solicitada, sem consultar todos os corpora.
Não há SQL, chamadas a vendors ou extração de livros dentro dos componentes.

`AudioProvider` fica acima das rotas e abaixo de `WorkbenchProvider`.
`useSyncExternalStore` publica snapshots estáveis e fornece snapshot inicial idêntico no SSR.
Nenhum objeto de síntese é criado no servidor; importação do módulo não abre SQLite/WASM,
OPFS ou áudio. O adapter é instanciado somente no navegador. Sair de uma rota não o cancela.
Recarregar/fechar o documento encerra a síntese; retomar depois exige ação explícita.

## Primeiro provedor e privacidade

O adapter usa a Web Speech API, sem dependência nova, chave, cobrança ou backend de voz.
Só oferece vozes que reportem `localService === true`; vozes remotas não são selecionáveis,
nem usadas como fallback. Requer voz instalada com o mesmo idioma-base do texto.
Disponibilidade e naturalidade dependem do navegador/SO: não prometer qualidade neural.
O início tem timeout de 15 segundos; cancelamento e mudança de conteúdo invalidam callbacks
antigos, inclusive os de erro e conclusão. Sem voz, a interface explica como recuperá-la.

Não existem adapters ativos de ElevenLabs/Gemini. Uma implementação futura exigirá backend
com segredo protegido, limites e consentimento explícito por texto privado antes do envio.
Não há clonagem de voz nem publicação/distribuição de gravações nesta fase.

Referências: [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis),
[localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService),
[store React/SSR](https://react.dev/reference/react/useSyncExternalStore).

## Literalidade, posição e invalidação

Texto original e falado são campos diferentes, mas nesta fase são **idênticos**. Segmentos
de até 600 unidades UTF-16 preferem pontuação/parágrafos e não cortam pares substitutos.
Sua concatenação reproduz exatamente o original. O intervalo de seleção é validado na edição;
nunca se troca uma tradução ausente por outra. O título da passagem não é inserido no texto.
Não se normalizam referências, termos gregos/hebraicos ou números silenciosamente.

O motor usa eventos reais de início, limites e conclusão. Alguns dispositivos não fornecem
limites por palavra: nesses casos a retomada pode repetir o segmento. Não há duração em
segundos, timeline de arquivo ou destaque sincronizado prometidos. Alterar velocidade/voz
reinicia a partir do último limite conhecido; vozes ausentes/incompatíveis não geram fala.

SHA-256 considera texto, origem completa e versão da preparação. Texto ou preparação
diferentes não herdam progresso antigo.
O contrato de fingerprint para futuros arquivos inclui texto realmente falado, preparação,
modelo, provedor, voz e parâmetros. **Não existe cache de arquivo nesta fase**: a Web Speech
API não fornece bytes de áudio para download. O provedor declara `exportAudio: false`.

## Persistência sem alterar o acervo

Não há migration nem outro banco de conhecimento. Assim como preferências de leitura,
`scriptorium.audio-progress.v1` mantém metadados validados em localStorage: até 20 leituras,
origem, hash, segmento/posição, data e configuração. Gravação por limite é reduzida a uma vez
a cada três segundos, com checkpoints adicionais ao pausar, trocar segmento e encerrar.
Bloqueio/quota/dados inválidos geram aviso sem impedir narração ou apagar outros dados.

Essa preferência pertence ao navegador/origem e não integra o backup SQLite do acervo.
Não é sincronizada entre navegadores ou com Android. Não armazena texto original, texto
preparado, PDF, transcrição ou arquivo. Texto pessoal e fila existem só na memória da sessão;
após reload, o histórico solicita colar o texto pessoal novamente. Passagens são relidas
do repositório e conferidas por hash antes da aplicação do progresso.

## Direitos

O serviço verifica a licença da edição contra as edições identificadas do repositório,
preserva atribuição e só oferece síntese local temporária para uso pessoal. Não implementa
exportação. Isso não equivale a permissão global para distribuir uma edição narrada; termos
territoriais e da edição devem ser avaliados antes de habilitar arquivos/publicação.
Direitos de texto, voz e futura gravação continuam separados.

## Próximas fases, sem controles falsos

1. Estúdio completo: perfis persistentes, prévias e configurações realmente suportadas.
2. Documentos, fontes, estudos e notas: seleção ancorada, fila persistente, reordenação e
   sequências; usar o caderno/repositórios atuais, sem copiar os PDFs.
3. Arquivos e catálogo editorial: cache limitado, direitos, transcrições e roteiros revisados.
4. Android: adapters de dados Kotlin e reprodução nativa; Media3/MediaSessionService para
   arquivos/streams, foco, notificação e Bluetooth. Não usar WebView como player universal.
5. Leitura guiada e pronúncias opt-in, mantendo o modo literal separado.

Biblioteca de Áudio informa que ainda não há episódios. Minha Coleção já mostra histórico
real, mas não inventa playlists, favoritos ou downloads. O Estúdio lista vozes locais reais;
os perfis e controles expressivos avançados são explicitamente posteriores.

## Verificação

Testes `src/lib/audio/*.test.ts` cobrem literalidade/Unicode, tamanho, hashes, origem/edição,
intervalo, direitos, progressão, pausa, cancelamento, callbacks antigos, fila, erros, timeout,
voz remota, idioma, persistência e SSR. No QA usar workspace temporário: não migrar o acervo
privado apenas para testar este módulo.

### Evidência desta execução — 21/10/2026

- `npm test`: **582/582**, 88 arquivos; 30 testes novos de áudio.
- `npm run typecheck`, ESLint dos TS/TSX alterados e `git diff --check`: aprovados.
- `$env:NITRO_PRESET='node-server'; npm run build`: aprovado. Preset apenas no processo de
  build/QA local; nenhuma alteração no target de produção/Cloudflare ou no Docker.
- Playwright/Chromium, produção `http://127.0.0.1:5174`,1440×1000 e390×844: página/título,
  conteúdo, controles, navegação, reload e layout verificados; sem erros de aplicação,
  sem overlay e sem overflow horizontal. Browser plugin não disponível; usado Playwright.
- Cinco vozes locais reais detectadas, incluindo Daniel e Maria pt-BR. Eventos de fala,
  `speechSynthesis.speaking`, pausa nativa e progresso por palavra observados; retomada após
  navegação/reload e narração real de Gênesis1:2–3. Velocidade1,5×, volume50% e fila conferidos.
  Não é avaliação humana da qualidade sonora. Falta de voz testada separadamente por injeção
  de catálogo vazio, sem substituir o teste positivo de síntese real.
- Workspace temporário separado do original; banco privado preservou mtime14:32:28 e não
  foi migrado/importado. Não executados novo APK, container ou teste em aparelho físico.
- Uma repetição reutilizando o workspace de QA após encerramento abrupto encontrou lock
  retido e HTTP423. A proteção não foi removida: o teste final repetiu em workspace temporário
  novo e passou sem erros. Não confundir esse estado operacional com erro de síntese.
- Avisos não bloqueantes do build: SQLite experimental do Node e tempo em plugins
  `vite-tsconfig-paths`/`replace`; nenhuma atualização de dependências foi feita para escondê-los.

### Arquivos da entrega

Criados:

- `src/lib/audio/contracts.ts`
- `src/lib/audio/preparation.ts`
- `src/lib/audio/native-speech-provider.ts`
- `src/lib/audio/progress-storage.ts`
- `src/lib/audio/audio-engine.ts`
- `src/lib/audio/scripture-narration.ts`
- `src/lib/audio/audio-engine.test.ts`
- `src/lib/audio/scripture-narration.test.ts`
- `src/components/audio/audio-context.tsx`
- `src/components/audio/use-audio.ts`
- `src/components/audio/audio-player.tsx`
- `src/components/audio/scripture-audio-actions.tsx`
- `src/routes/audio.tsx`
- `docs/architecture/scriptorium-audio.md`

Alterados:

- `src/routes/__root.tsx`
- `src/routes/scripture/$book.$chapter.tsx`
- `src/components/shell/app-shell.tsx`
- `src/components/shell/navigation.ts`
- `src/lib/repositories/scripture-repository.ts`
- `src/routeTree.gen.ts` (gerado pelo Router; não editado manualmente)
- `README.md`
- `.codex/PROJECT_MEMORY.md`
