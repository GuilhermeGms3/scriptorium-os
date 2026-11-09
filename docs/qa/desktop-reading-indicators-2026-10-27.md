# QA — indicadores de leitura no desktop — 27/10/2026

## Escopo e critérios

- Faixa de 32 px, reservada à esquerda, com indicador ativo animado e janela de até
  nove destinos por grupo, reduzida conforme a altura disponível.
- Escrituras: Leitura, original, interlinear, comparação e exploração horizontal.
- Biblioteca: páginas físicas, unidades e trechos do texto montado; leitor contextual.
- Texto, offsets, seleções, realces, acervo e leitores Android preservados.
- Sem dependência, serviço, endpoint, migration, corpus ou APK novo.

## Gate

- `npm run test:quick`: **631 testes / 103 arquivos**, sem falhas.
- Novos testes: janela de navegação em obra com 3.000 destinos; sincronização sem
  prender-se à sobra da seção anterior; parágrafos/CRLF/Unicode; limites de frases;
  texto selecionável idêntico, realce que atravessa limites visuais e escape de HTML.
- `npm run typecheck`: aprovado.
- ESLint dos arquivos TypeScript/TSX envolvidos: sem erros ou avisos.
- Prettier dos arquivos envolvidos: aprovado.
- `npm --ignore-scripts run build`: aprovado, sem reconstrução dos corpora.
- `git diff --check`: aprovado.

Logs locais em `%TEMP%/desktop-indicators-{tests,typecheck,eslint,build}.log`.

## Navegador com dados reais

Browser plugin indisponível no inventário. Usado Playwright já instalado no runtime,
sem instalar ferramentas. Porta 5174; Chromium headless; 1440×1000, 1024×768 e390×844,
temas claro/escuro e preferência de movimento reduzido.

As requisições da instalação foram interceptadas pelo harness: consultas executadas
por `node:sqlite` com `readOnly:true`, demais comandos recusados. Resultado: **zero
comandos de escrita no banco pessoal e nenhuma exceção de aplicação**. Não foram
publicados comentários, alteradas notas ou executadas migrations durante o QA.

Fluxos aprovados:

1. Gênesis3: clique no versículo5, posição ativa correspondente, gutter de32px fora
   da área do texto. End alcança o versículo24, Home retorna ao1; foco preservado.
2. Explorar versículos mantém a navegação vertical e os caminhos horizontais.
   Com comentários completos abaixo do texto, o indicador conserva o versículo
   correspondente durante a leitura do comentário, mesmo sem um verso visível.
3. João1: saltos por versículo em Texto original, Interlinear e Comparação.
4. Confissões: troca para unidadeIII, avanço ao trecho4, seleção exata de UTF-16
   de3 a1103 atravessando dois spans, conferida com o texto integral.
5. A seleção abre o leitor contextual, no qual o scrollspy também navega pelos trechos.
6. A Cidade de Deus Vol.01: página9, trecho2, troca para página10; `textContent` das
   duas páginas conferido contra o original do banco. A obra possui822 páginas;
   o indicador não monta822 botões nem carrega o conteúdo das outras páginas.
7. Nenhum overflow horizontal de página em1440/1024/390; faixa oculta em390 e
   retorno ao desktop sem necessidade de recarregar.

Harness: `%TEMP%/scriptorium-desktop-indicators-qa.cjs`.
Log: `%TEMP%/desktop-indicators-browser.log`.
Capturas inspecionadas: `%TEMP%/desktop-indicators-scripture.png`,
`desktop-indicators-exploration.png`, `desktop-indicators-primary.png`,
`desktop-indicators-private.png`, `desktop-indicators-light.png`.

## Ajustes durante o QA e limites

Home/End podem trocar toda a janela de destinos. O foco passou a aguardar a seção
alvo ficar ativa, para não se perder quando o botão anterior sai do DOM durante a
rolagem suave. O cenário com foco foi retestado.

A primeira abertura no servidor Vite de desenvolvimento emitiu um aviso React de
atualização antes da montagem; não houve exceção nem falha dos fluxos. A causa desse
aviso de desenvolvimento não foi isolada nesta alteração; não foi desativado logging.
Um diagnóstico posterior não o reproduziu nem com os indicadores nem com o componente
desviado somente em memória no harness (`desktop-indicators-mount-diagnostic.log`).

Os trechos são limites de navegação, não reconstrução editorial dos parágrafos do
autor ou correção de OCR. Não se verificou manualmente cada livro instalado. Android
não mudou e não precisou de build ou instalação nesta tarefa.
