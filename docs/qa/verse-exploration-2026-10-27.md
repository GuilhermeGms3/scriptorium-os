# QA — caminhos horizontais dos versículos — 27/10/2026

## Escopo

Web/desktop, entrada opcional em Escrituras/Leitura. Sem alteração no aplicativo
Android, conteúdo persistido, schema, corpus, árvore ou progresso de Estudos.

## Dados e isolamento

Browser plugin indisponível no inventário desta sessão: utilizado o Playwright já
instalado no runtime do Codex, sem dependência nova. Chromium headless.

As chamadas de workspace do navegador foram interceptadas exclusivamente pelo harness
local. Consultas foram executadas com `node:sqlite DatabaseSync({readOnly:true})` sobre
o banco existente; outros comandos recusados. A aplicação não recebeu acesso de escrita
ao workspace pessoal. Não foram importados, copiados ou reconstruídos bancos/PDFs.

O teste de notas usou outro contexto, OPFS descartável e API da instalação bloqueada.
Apenas os registros de comentário já consultados foram usados em memória para exercitar
a tela; o teste não publicou conteúdo novo nem escreveu notas no banco pessoal.

## Cenários

- Leitura contínua como padrão; entrada/saída da exploração sem substituir o leitor.
- 168 versículos em cinco capítulos reais: Gênesis3 (24), João1 (51), Salmo23 (6),
  Romanos8 (39), Mateus5 (48). Todos tiveram blocos disponíveis na instalação consultada.
- Gênesis3:3–5 blocos por versículo, com os trechos agrupados por fonte/categoria.
  Contagens variam conforme filtros, notas e conteúdo instalado.
- Arrasto horizontal com mouse, sem clique acidental na janela; foco e tecla Home.
- Abertura do comentário, fonte/página, texto desenvolvido, relação e limites.
- Consulta do original no leitor contextual existente.
- Nota no OPFS descartável, persistida com âncora exata de Gn3:1 e refletida no caminho.
- Cancelamento do fechamento conserva o rascunho.
- Tema escuro e claro; larguras1680,1440,1024 e390; nenhuma rolagem horizontal da página.
  Em390 a opção é retirada e o leitor habitual continua renderizado.
- Não foram inferidas categorias vazias ou promovidas associações automáticas a revisão humana.

Harness e screenshots locais ficam em `%TEMP%/scriptorium-verse-exploration-qa.cjs`,
`verse-exploration-browser.log`, `verse-exploration-desktop.png`,
`verse-exploration-detail.png`, `verse-exploration-light.png`.

## Gate automatizado

- `npm run test:quick`:624 testes/101 arquivos, sem falhas. Inclui oito casos novos
  sobre projeção, intervalos, agrupamento sem descarte, menções sem comentário,
  classificações rejeitadas, placeholders/demonstrações e notas/versificações.
- `npm run typecheck`: aprovado.
- ESLint dos cinco arquivos TypeScript/TSX alterados/criados: sem erros ou avisos.
- Prettier dos arquivos alterados/criados: aprovado.
- `npm --ignore-scripts run build`: aprovado, sem reconstruir os corpora.
- `git diff --check`: aprovado. Nenhuma migration ou dependência adicionada.
- Browser: sem erros de aplicação, zero comandos de escrita no banco pessoal;
  nota/rascunho exercitados exclusivamente no OPFS descartável.

## Ajustes encontrados durante o QA

Primeiro teste expôs detecções de referências sem comentário contextualizado: elas
produziam caminhos excessivos e títulos de seção que não explicavam o versículo.
Foram excluídas da projeção, preservadas no inspetor original. Contextos amplos ficam
no panorama, e trechos repetidos de uma fonte/categoria são agrupados sem descarte.

O seletor do harness para a nota inicialmente não aceitava o espaço entre categoria e
título no nome acessível; corrigido para localizar pelo texto do bloco. O salvamento
já havia ocorrido. Uma captura durante a animação da janela foi refeita após estabilizar.
O teste de cancelamento também identificou instabilidade no nome acessível do campo
após digitar; labels explícitos com `htmlFor`/`id` corrigiram o problema. O rascunho foi
preservado e o cenário retestado.

## Limites

Verificação funcional/estrutural, não revisão acadêmica de todas as fontes. A qualidade
do OCR, das sínteses e dos vínculos automáticos preexistentes não foi reclassificada.
Não foram escritos novos ensaios por versículo; o recurso apresenta conteúdo real já
disponível e acompanha o crescimento do acervo. Nenhum APK foi gerado ou instalado.
