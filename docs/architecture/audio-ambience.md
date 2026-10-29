# Música e Ambiente — primeira entrega

Complemento do [Scriptorium Áudio](scriptorium-audio.md), implementado em 22/10/2026.
Escopo: ambientação funcional web. Não é a segunda entrega (ducking/perfis/transições)
nem a produção/exportação de episódios. Android nativo não foi alterado.

## Uso

1. Abra **Áudio → Estúdio de Voz → Música e Ambiente**. Os ajustes também estão no player
   completo e no atalho **Ambiente** do mini player, sem poluir os versículos.
2. Use **Adicionar minha música**. O app guarda uma cópia privada local do arquivo validado.
3. Escolha **Voz**, **Voz + Música** ou **Música**. Inicie a narração normalmente no leitor.
4. Ajuste os volumes separadamente. Mudar a música não reconstrói a narração.
5. **Repetir música** controla o loop real do arquivo. **Pausar música junto da narração**
   define se a pausa manual da voz também pausa o canal musical. Sem essa opção, a música continua.
6. **Organizar trilha** permite renomear, classificar e remover a cópia local com confirmação.
   O original escolhido no computador não é excluído. Reimportar os mesmos bytes não duplica a música.

As preferências voltam após reload, mas nenhuma reprodução começa automaticamente.
Fechar o player interrompe os dois canais; navegar entre rotas mantém o mesmo controlador.
Trocar para somente música pausa a voz, preservando o ponto; voltar ao modo de voz retoma
somente a narração que o próprio modo havia pausado, não uma leitura pausada manualmente.

## Arquitetura e escolhas

```text
AudioProvider → AudioEngine
                ├── canal A: NarrationProvider / voz local
                └── canal B: AmbienceController → BrowserMusicChannel
                                         ├── BrowserMusicAssetStore (arquivos/metadados)
                                         └── BrowserAmbiencePreferences (ajustes)
```

Há um único motor e um único mini player, não dois players concorrentes por rota.
O controlador de ambiente é uma responsabilidade interna do motor existente, injetável em
testes. `AudioSnapshot.ambience` publica metadados, estado e ajustes pelo mesmo store React.
Callbacks/respostas antigas são invalidados ao pausar, trocar arquivos ou encerrar.
O canal libera object URLs e handlers quando um arquivo é substituído ou fechado.

Foi avaliada a Web Audio API. Para esta entrega, um `HTMLAudioElement` privado ao canal é
suficiente para arquivo, ganho e repetição, sem `AudioContext` ou dependências novas.
A voz nativa Web Speech não oferece um stream PCM que possa ser ligado a um grafo Web Audio.
Fingir que ambos estão num grafo exportável seria incorreto. Um futuro ganho/crossfade Web Audio
poderá substituir o adapter musical sem mudar o domínio ou criar outro motor global.

**Volume da voz nativa:** aplicado no próximo segmento, sem cortar a frase atual. Não há
garantia de ganho instantâneo na voz nativa. Volume musical usa o controle real do elemento;
seu suporte depende do navegador/plataforma, especialmente em navegadores móveis. QA real
foi no Chromium/Windows; não equivale a certificação de ganho no Safari/iOS.

## Importação e integridade

- Extensão aceita: MP3, WAV, M4A ou AAC. Há inspeção binária de assinatura/container e tipo
  declarado; a extensão sozinha não basta. Metadados ID3 externos não são interpretados.
- O navegador deve conseguir ler duração finita e decodificar os primeiros frames, com timeout
  de 15s e cancelamento. Falhas posteriores no corpo do arquivo são tratadas pelo canal, não
  se promete validação integral de todos os frames. Codecs dependem da plataforma.
- Máximo 50 MiB por arquivo e duas horas; biblioteca limitada a 100 arquivos/500 MiB.
- Identidade SHA-256 dos bytes; título e categoria não são identidade. Importação duplicada
  preserva o nome/categoria editados e pode recuperar um arquivo ausente no cache.
- `IndexedDB` **scriptorium-local-audio**, versão 1: stores `tracks` e `files`.
  Metadados e blob são gravados/removidos juntos em transação. A verificação de limites ocorre
  dentro da transação de escrita, inclusive diante de imports concorrentes entre abas.
  Não se carregam todos os blobs para listar o catálogo. Não há migration do workspace SQLite.
- Configuração em `scriptorium.ambience.v1`: modo, arquivo selecionado, volume musical,
  loop e pausa conjunta. Voz/velocidade/volume da voz permanecem na preferência de áudio existente.

**Limite de transporte importante:** músicas e ajustes pertencem ao navegador/origem, não
à pasta `data/workspace`, ao Git, Docker, APK ou backup do acervo. A interface informa isso.
O arquivo escolhido é copiado; removê-lo de sua pasta original não remove a cópia importada.
Limpar dados do site ou uma eventual remoção por quota do navegador pode apagar essa cópia.
Se o arquivo/cache desaparecer, há erro recuperável e possibilidade de reimportação.
Não há promessa de sincronização ou backup musical nesta primeira entrega.

## Privacidade e direitos

Não existe upload HTTP, integração externa, download de streaming ou credencial nova.
Os arquivos são lidos pelo browser e expostos somente ao canal por URLs `blob:` temporárias.
Nenhuma trilha pública fictícia foi cadastrada. O catálogo distribuível fica vazio até
haver arquivos com origem/licença/atribuição e permissões verificadas.

Os imports são identificados como `user-file`, autor não informado, licença privada não
verificada, reprodução pessoal e **sem permissão presumida de redistribuição/exportação**.
Importar não comprova a titularidade nem concede licença para publicar uma mixagem.
O áudio de QA é um sinal WAV criado apenas para o teste, não uma música publicada no catálogo.

## Fora desta entrega

Segunda entrega: ducking com histerese, fade-in/out, crossfade, perfis nomeados editáveis,
favoritos e catálogo licenciado. Terceira: projetos, arquivos de narração independentes,
prévia/mixagem/codificação de exportação e ambientações editoriais por episódio.
Loop gapless não é prometido: depende do codec, arquivo e navegador.
Reprodução simultânea não gera um arquivo mixado. Voz/música de terceiros previamente
mixadas não são separadas. Nenhum recurso novo de segundo plano nativo foi criado.

Referências técnicas:
[play()/autoplay](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play),
[HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement),
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

## Verificação

`src/lib/audio/ambience.test.ts` cobre modos, pausa/resumo, independência dos canais, loop,
persistência, catálogo indisponível, resposta atrasada, rejeição de autoplay/arquivo ausente,
renomeação, exclusão, assinaturas, direitos, hash, duração e cancelamento.
O QA de navegador usa WAV gerado localmente + síntese nativa real, não um mock positivo.
Fixtures/scripts/screenshots ficam em pasta temporária externa ao repositório.

### Resultado observado — 22/10/2026

- `npm test`: 600 testes/90 arquivos aprovados, incluindo 15 novos de ambientação; o total
  considera o estado colaborativo do diretório, não só os arquivos desta entrega.
- `npm run typecheck`, ESLint dos arquivos de áudio alterados e build `node-server`: aprovados.
  Preset aplicado apenas no comando local, sem mudar o target de produção ou o Docker.
- Playwright/Chromium em produção `http://127.0.0.1:5174`, 1440×1000 e 390×844: narração
  nativa real de Gênesis 1 + WAV local real, modos, ganho musical, pausa/resumo sem nova
  síntese, navegação para Busca, reload sem autoplay, deduplicação, arquivo inválido,
  renomeação/exclusão e responsividade. Sem erros de aplicação ou overflow horizontal.
- Browser plugin indisponível; usado Playwright existente, sem instalar dependências.
  No desenvolvimento houve reload por relatórios Android gerados pelo trabalho paralelo;
  o teste final foi isolado na build de produção. Não mudar watchers de outro módulo para
  mascarar esse comportamento de desenvolvimento.
- Nenhuma avaliação humana de qualidade sonora ou certificação de MP3/M4A/AAC em todos
  os navegadores; o teste positivo de arquivo usou PCM WAV. Não testados Safari/iOS, novo
  APK, mídia em background nativo nem Docker. Acervo original não foi aberto/migrado para QA.

### Arquivos principais

Novos: `ambience-contracts.ts`, `ambience-controller.ts`, `browser-music-channel.ts`,
`music-assets.ts`, `music-import.ts` e `ambience.test.ts` em `src/lib/audio/`;
`src/components/audio/ambience-panel.tsx` e este documento.
Integrações: `audio-engine.ts`, `contracts.ts`, `audio-context.tsx`, `audio-player.tsx`,
`src/routes/audio.tsx`, README, documento da fundação de áudio e memória local do projeto.
Nenhum arquivo Android, pipeline de livros, corpus ou banco original pertence a este commit.
