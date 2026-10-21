# Experiência de front-end

## Diagnóstico

O Scriptorium possui três contextos de trabalho distintos, mas o shell histórico os tratava como
se todos fossem uma passagem bíblica. O inspetor da passagem permanecia visível na Biblioteca, nos
Estudos e no Mapa de Conhecimento, mesmo sem uma passagem selecionada. Algumas telas chegavam a
cinco colunas concorrentes e repetiam muitos estados vazios.

O domínio e os serviços já são mais ricos que a apresentação. Existem leitura paralela, texto
original, interlinear, conhecimento privado por passagem, tradução local, grafo argumentativo,
fontes primárias, estudos e pipeline documental. A prioridade do front não é criar novos módulos,
mas tornar essas capacidades descobríveis no contexto correto.

## Modelo de experiência

### Rastro

- Módulo principal `/trace`, acessível também nos cartões de conhecimento do leitor.
- Filtros por fonte/passagem/estado e detalhe progressivo: motivo, evidência, original, histórico.
- Consultas reais sobre propostas e decisões do workspace, sem mocks ou novos corpora.
- Dados técnicos ficam recolhidos. Estados antigos sem justificativa detalhada são explícitos.
- Histórico persistente descrito em [knowledge-trace.md](knowledge-trace.md).

### Leitura

- A Bíblia é o centro visual; o leitor abre só com o texto.
- Livros e capítulos são escolhidos pelo botão “Livro capítulo ▾” do topo do texto, numa janela com
  busca, testamentos e capítulos em números grandes; não há coluna fixa de livros.
- Explicações pertinentes podem aparecer logo após o versículo e ser desativadas.
- O painel de estudo (antigo inspetor) começa fechado e abre ao selecionar um versículo ou uma
  palavra; é contextual, nunca global, e sempre tem “Fechar”.
- Texto original, comparação e interlinear são modos da mesma leitura, não destinos separados.

### Biblioteca

- Os livros do usuário vêm primeiro (“Meus livros”, com busca e filtro por tipo de livro); fontes
  primárias, Nag Hammadi, referências e importação bibliográfica ficam em abas logo abaixo.
- Tradução, OCR, desmontagem, auditoria e cobertura são ferramentas contextuais do documento.
- Controles operacionais em lote ficam em “Processamento”, recolhido, com uma linha de estado.
- Original, tradução auxiliar, fonte, página e estado de revisão devem permanecer distinguíveis.

### Investigação

- Estudos organizam perguntas, materiais e conclusões do usuário.
- O Mapa de Conhecimento serve para navegar relações já sustentadas por fontes.
- Entidades sem relações não devem produzir uma parede de painéis vazios.
- Detalhes técnicos permanecem disponíveis, mas recolhidos por padrão.

## Regras de composição

1. No máximo três regiões simultâneas: navegação, trabalho principal e contexto.
2. Painéis contextuais só aparecem quando possuem contexto válido.
3. Estados vazios semelhantes são consolidados em uma explicação acionável.
4. Recursos avançados usam divulgação progressiva; não competem com a tarefa principal.
5. Nenhuma relação, tradução ou explicação é inventada para preencher a interface.

## Sequência de evolução

1. Shell contextual e redução de ruído nas telas existentes.
2. Leitor focado em passagem, com seleção clara e painel contextual reorganizado.
3. Biblioteca orientada a obras, com tradução local e pipeline descobríveis por documento.
4. Estudos orientados a perguntas e materiais, sem exposição de estruturas internas.
5. Mapa de Conhecimento com busca, filtros e visualização somente de relações reais.
6. Revisão responsiva e navegação móvel para os fluxos principais.

## Reestruturação funcional de outubro de 2026

- A tela inicial usa uma rotação diária determinística entre todos os capítulos instalados e mostra
  somente exegese, hermenêutica e contexto realmente vinculados à passagem. A última leitura fica
  no navegador; João 1 não é mais um destino fixo.
- A navegação bíblica agrupa Pentateuco, históricos, poéticos, profetas, evangelhos, cartas,
  apocalíptico e textos adicionais. “Deuterocanônico” descreve a coleção de navegação, não uma
  identidade textual universal.
- Estudos é a porta de entrada para trilhas teológicas, históricas, literárias e hermenêuticas. O
  mapa de conhecimento continua acessível ali para investigação profunda, mas deixou de competir
  como módulo primário sem propósito claro.
- Biblioteca é o catálogo de leitura. Importação, OCR, desmontagem, conexão e auditoria vivem na
  Oficina da Biblioteca (`/library/process`). PDFs privados continuam vinculados à origem OPFS do
  navegador, portanto trocar porta, domínio ou navegador exige reimportar os originais.
- Busca apresenta exemplos por intenção e filtros por grupo, sem alterar o índice SQLite/FTS real.
- Inspetores exibem apenas abas com conteúdo ou ação útil. Trechos privados conectados mostram
  afirmações e argumentos primeiro; a evidência textual completa permanece recolhida e citável.
- O tradutor local aparece junto às definições lexicais inglesas e preserva o original. A cobertura
  atual continua inglês→português; outros idiomas não recebem um botão enganoso.

## Árvore visual de estudos

- A entrada de Estudos é um mapa pedagógico navegável, não uma grade de categorias. Um nó central
  se ramifica em Bíblia e interpretação, Teologia, História e tradições e Literatura e fontes; as
  etapas seguintes reutilizam as trilhas e obras realmente registradas em `STUDY_PATHS`.
- Linhas representam organização pedagógica, não dependência dogmática nem inferência do grafo de
  conhecimento. O mapa livre continua sendo o Knowledge Explorer e as investigações pessoais
  continuam sendo workspaces locais distintos.
- O estado de uma etapa é derivado do workspace e do acervo: disponível, investigação iniciada ou
  acervo insuficiente. A interface não produz XP, domínio ou conclusão automática. Quantidades
  exibidas medem atividade registrada e materiais reunidos.
- O centro se chama **Teologia**. Cada um dos 16 nós abre uma página própria em
  `/study/guide/$topic`; o mapa não possui inspetor direito. Jornadas e canvas ocupam duas regiões
  no desktop e se empilham em viewport estreita, com rolagem interna do canvas.
- `study-guides.ts` define roteiros editoriais originais, módulos, perguntas, passagens e relações
  pedagógicas. O guia central oferece uma formação panorâmica; os temas têm roteiros específicos.
  Roteiro não significa enciclopédia completa nem conteúdo extraído automaticamente de livros.
- `StudyGuideService` consulta manifestos (sem abrir corpora completos), FTS privado e índice de
  conhecimento. Há até três consultas por índice, seis resultados por consulta e doze páginas
  deduplicadas por documento/página. Resultados textuais não são links semânticos aprovados.
- Falhas de um índice não eliminam os resultados dos demais. Loading, consulta vazia, catálogo
  incompleto e repetição da consulta são explícitos. Os índices são consultados novamente ao
  reabrir o guia; não há cache próprio adicional que esconda mutações do workspace.
- A investigação pessoal reutiliza Study/ResearchQuestion, com marcador estável
  `study-guide:<id>` em StudyItem. Retoma por marcador ou, para estudos antigos, pelo título.
  Perguntas repetidas no mesmo estudo não são inseridas novamente pela ação do guia. O workspace
  oferece retorno ao roteiro; não foram introduzidos novos bancos, endpoints ou migrations.
- O roteador reinicia o scroller interno somente quando o destino contém `data-study-guide`.
  Isso impede abrir um guia no meio da página sem alterar a restauração de posição do Reader.
- QA desta entrega: navegação centro → Teologia, tema → Hermenêutica, pergunta → investigação
  existente (sem duplicação ao repetir a ação), retorno ao guia e abertura de PDF na página 29.
  Verificados desktop e viewport de 390 px, sem overflow global no guia e com console limpo.

## Organização do front para leitores não técnicos (outubro de 2026)

Público principal: teólogos, padres, pastores e estudantes, em geral pouco habituados a
ferramentas técnicas. Cada tela tem uma tarefa principal; o resto fica a um clique, recolhido.
Esta seção substitui as notas anteriores onde houver conflito (por exemplo, o Mapa de
Conhecimento voltou a ter entrada própria no menu).

### Navegação

- Barra lateral em três grupos com rótulo pequeno: **Ler** (Início, Escrituras, Busca),
  **Estudar** (Estudos, Mapa de conhecimento) e **Biblioteca**. No fundo, discretos: Rastro
  (“Registro técnico das ligações”), Configurações e Ajuda. O item ativo tem fundo e uma barra na
  cor primária. A definição fica em `src/components/shell/navigation.ts`.
- “Importar e processar” não está no menu: é o botão principal “Adicionar livro” da Biblioteca.
  A rota `/library/process` continua válida.
- No celular: cinco destinos na barra inferior e “Mais” com o restante; nada fica inacessível.
- A barra de estado usa frases simples (“Guardado neste computador”, “Funciona sem internet”) e
  mostra a mensagem do lock do acervo quando outro processo o tem aberto.

### Leitor e painel de estudo

- No máximo três regiões: menu, texto e painel de estudo. A partir de 1280 px o painel fica ao
  lado do texto; abaixo disso abre por cima (folha lateral); no celular é uma gaveta inferior.
- O painel mostra no topo “Versículo selecionado: …” e tem quatro abas: Visão geral, Texto e
  língua, Fontes, Minhas notas. As abas sem conteúdo não aparecem.
- “O que existe para esta passagem” é uma frase; a tabela por área fica recolhida.
- Ligações privadas por confirmar têm borda tracejada âmbar, o selo “Por confirmar” com ícone e a
  pergunta “Esta ligação está correta?”; as confirmadas têm um visto e “Confirmada”
  (`ReviewStateBadge`).

### Biblioteca e página do livro

- Biblioteca: cabeçalho com “Adicionar livro”, “Meus livros”, abas de catálogo e “Processamento”
  recolhido com o resumo “N livros · N estruturados · N precisam de OCR”, calculado por uma
  consulta leve (`LibraryCoverageService.quickSummary`). O relatório completo só é calculado
  quando a seção é aberta.
- Página do livro: a página à esquerda (navegação e busca no livro); à direita, abas Ligações,
  Estrutura, Tradução e Sobre o livro (perfil com correção, assuntos e dicionários). Desmontar,
  OCR, auditoria e reprocessar ficam em “Processamento”, no fim do painel, com o estado numa frase.

### Componentes de página

- `PageHeader` (rótulo, título serifado `text-2xl`, descrição e ações à direita),
  `PageContainer` (larguras `narrow`, `default`, `wide` e o mesmo espaçamento vertical),
  `SectionHeader` (variante padrão ou `meta`) e `EmptyState` (ícone, título, explicação e,
  quando houver, a próxima ação), em `src/components/layout/`. Novas páginas devem usá-los.

### Escala tipográfica e acessibilidade

- Nenhum texto de interface abaixo de 12 px (`text-xs`). Só a `.meta-label` (rótulo de seção em
  maiúsculas monoespaçadas) usa 11 px (`0.6875rem`). Tamanhos arbitrários (`text-[10px]` etc.)
  não devem voltar. O texto bíblico e o original seguem as preferências de leitura.
- Ações principais com pelo menos 32 px de altura; foco visível em todos os elementos interativos
  (contorno global em `--ring` ou anel `focus-visible:ring-2`); botões só com ícone têm
  `aria-label`; texto secundário sem opacidade reduzida, para manter contraste AA.
- Cores, fontes e raios continuam os tokens de `src/styles.css`; nenhuma cor nova foi criada.

### Abertura

- Toda vez que o app começa numa página aparece a abertura do Scriptorium OS, na mesma identidade
  da barra do topo: IBM Plex Mono em maiúsculas espaçadas, o ícone do livro e só as cores do tema.
  O ícone é desenhado, cada letra de SCRIPTORIUM passa por letras hebraicas e gregas até cair na latina
  (passando pela letra grega de onde vem: S ← Σ, P ← Π…), o "OS" chega, o lema é datilografado e,
  no fim, o nome voa até o logotipo do topo enquanto o app aparece. Cerca de 5 s; um clique, Esc,
  Enter ou espaço pulam. Com "reduzir movimento", a página já vem pronta e só se desvanece.
- Aparece no primeiro quadro, sem esperar o app carregar: a marcação está no HTML do servidor
  (`IntroSplash`, no `<body>` do `RootShell`) e toda a animação é CSS (`intro-splash.css`). Um
  script no `<head>` (`intro-controller.ts`) liga a abertura antes da primeira pintura (classe
  `intro-on` no `<html>`), conta o tempo a partir do início real da animação, cuida do "pular" e do
  voo até `[data-brand-mark]` da barra do topo. O React só desenha a marcação, que nunca muda.
- "Começa numa página" é aba nova, recarregar, abrir de novo depois de fechar ou voltar a uma aba
  que o navegador ou o celular descartou para liberar memória (ela recarrega). Uma aba que só foi
  para segundo plano e continuou viva não repete. Se a página começa escondida (aberta em segundo
  plano, janela minimizada), a abertura fica parada no primeiro quadro (`intro-wait`) e corre quando
  a página aparece na tela. "Ver a abertura de novo", em Ajuda e sobre, a repete a qualquer momento.
- Não depende de `localStorage` nem de `sessionStorage`; a antiga chave `scriptorium.intro.v1`
  é ignorada. Navegação interna não repete a abertura.
- Em Hoje, os blocos recebem uma revelação progressiva de tinta/papiro, inspirada em inscrições
  antigas, sem substituir letras ou alterar conteúdo. O efeito espera a abertura terminar e dura
  até 1,25 s. Não usa animação por caractere nem dependências. Reduzir movimento desativa o efeito;
  foco de teclado revela imediatamente o bloco, sem recortar controles.

### Leitura de dados nas telas

- O [leitor contextual e caderno de notas](study-notebook.md) permite consultar as fontes da
  sidebar sobre a passagem, guardar notas por grupo e conectar pontos coloridos. Biblioteca
  continua uma navegação explícita, não um desvio obrigatório ao clicar em uma imagem.

- Telas novas leem o banco com `useWorkspaceQuery` (`src/hooks/use-workspace-query.ts`), sobre o
  React Query: cada chave guarda a sua resposta (trocar depressa não mostra o resultado anterior),
  erros chegam à tela e nada repete sozinho. `refreshOnKnowledgeChange` recarrega quando a
  biblioteca muda, no máximo algumas vezes por segundo e nunca duas vezes ao mesmo tempo;
  `keepPrevious` mantém a resposta anterior enquanto a nova carrega.
- Uma página que falha mostra `RouteError` dentro do app, com "Tentar novamente"; o menu continua.
- A barra do leitor se ajusta à largura da própria coluna (`@container`): com o painel de estudo
  aberto fica numa linha, e só o modo de leitura escolhido mostra o nome.

## Estudos, ambientes e comentários — 2026-10-17

- A árvore de Estudos incorpora o catálogo existente, consultado por `KnowledgeQueryService`.
  Os sete núcleos de `study-knowledge.ts` agrupam tipos canônicos por finalidade de estudo:
  interpretação, questões da fé, campos teológicos, ideias, tradições, testemunhos históricos e obras.
  A classificação é pedagógica; linhas e proximidade não afirmam influência ou concordância.
  Cada registro abre as mesmas afirmações, argumentos e fontes existentes, sem uma cópia do banco.
- O antigo mapa deixa a navegação principal. `/knowledge?entity=…` e `?claim=…` redirecionam
  para Estudos preservando a seleção. Não se gera conhecimento, aprovação ou progresso automático.
  O caderno de notas e suas conexões continuam uma funcionalidade independente; sua futura
  projeção na árvore não é inferida a partir desses agrupamentos.
- O diagrama usa círculos por nível, títulos externos, quatro cores de ramo e guia horizontal.
  Em telas estreitas, ramos e diagrama possuem rolagem própria, sem alargar a página.
  Os guias mostram uma etapa por vez, com navegação horizontal, perguntas destacadas e anterior/próxima.
  O texto editorial permanece íntegro. Trocar etapa não registra aprendizado ou conclusão.
- Os ambientes Branco, Preto, Cinza e Marrom usam os mesmos tokens semânticos e a mesma preferência
  `scriptorium.theme.v1`. Sistema continua seguindo a preferência do dispositivo. O script anterior
  à primeira pintura e o provider compartilham o contrato de tema, com teste de consistência.
- O leitor oferece comentários no texto, em painel inferior redimensionável ou ocultos.
  A escolha é local (`scriptorium.commentary-layout.v1`). O painel segue a seleção do versículo,
  permite consultar o capítulo inteiro e usa `VerseCommentary`, o mesmo caminho de renderização
  e revisão do modo inline. Não reprocessa PDFs nem muda vínculos, filtros ou estados editoriais.
  O separador aceita teclado; fechar devolve o foco ao seletor. Abrir o painel fecha o inspetor
  lateral para evitar regiões concorrentes; o usuário ainda pode abri-lo explicitamente.
- Texto bíblico conserva a serifa e as preferências de tamanho/entrelinha. Comentários usam sans,
  entrelinha confortável, fonte destacada e procedência separada; somente o hover sublinha o corpo.
  Tradução auxiliar e comentário original mantêm os rótulos de revisão e proveniência.

## Espaços por tema — 2026-10-17

- Aprofundamento em `study-topic-workspace.md`: Percurso, Leituras, Conexões, Caderno e Vídeos.
- Núcleos da árvore abrem constelações paginadas de oito temas; o mapa geral mostra as notas reais.
- Texto bíblico, FTS público/privado, fontes do catálogo e notas existentes são consultados nos
  repositórios canônicos. A interface mostra uma etapa e uma leitura por vez, com origem explícita.
- O caderno mantém o vínculo de ida e volta com o tema, preserva o rascunho entre abas e exibe
  grupos/notas no grafo sem inferir relações por coincidência de palavras.
- YouTube é opcional e explícito: chave restrita de navegador somente na memória da aba,
  sem envio de notas/livros, cache temporário e player carregado apenas sob ação do usuário.

## Leitura no celular sem procurar — 2026-10-20

Depois do uso real no celular (Nielsen 6, reconhecimento em vez de memorização, e excesso de carga
cognitiva), o leitor e a busca passaram a levar direto ao versículo e a mostrar só o que se escolhe.

- **Direto ao versículo.** Resultados de referência e de texto apontam para
  `/scripture/<livro>/<cap>?v=<versículo>` (e `edition`, quando o resultado é de uma edição),
  montado por `scriptureHref`. O leitor rola só a coluna do texto até o versículo e o seleciona; volta
  a rolar uma vez quando os comentários da biblioteca chegam. O `#verse-N` antigo continua aceito.
- **Seletor “Versículo”** na barra do leitor, ao lado de “Livro capítulo ▾”: escolher o número leva
  ao versículo sem rolar o capítulo.
- **Barra do leitor numa linha.** Tradução, comentários e modo de leitura ficam na barra quando há
  espaço (container ≥ 60rem) e, no celular ou ao lado do painel, atrás de “Opções”, com os nomes por
  extenso.
- **Comentários resumidos (padrão).** Debaixo de cada versículo, uma etiqueta por fonte que o comenta;
  tocar abre só aquela nota (“Abrir todos” abre as demais). As opções são “resumidos”, “completos”
  (o comportamento anterior, tudo aberto), “no painel” e “ocultar”. Notas sobre mais de sete
  versículos vão uma vez para o “Panorama do capítulo”, em vez de se repetirem em cada versículo. A
  pílula “N ligações na biblioteca” só aparece, no modo resumido, quando há ligação por confirmar.
  Medido com três fontes em João 3: o capítulo caiu de cerca de 28.900 px para 5.500 px de altura.
- **Barra de fontes.** Sob a barra do leitor, sempre visível, uma etiqueta por fonte que comenta o
  capítulo (ligada/desligada) e o filtro de área. As fontes desligadas ficam lembradas entre capítulos
  e visitas (`scriptorium.commentary-hidden-sources.v1`); o filtro de área volta a “todas” ao trocar de
  capítulo. Substitui a caixa “Filtrar biblioteca conectada”, que ficava no topo do texto.
- **Busca.** No celular os três caminhos viram uma fileira compacta e a caixa de busca fica na primeira
  tela; o campo tem 16 px (o iOS dá zoom abaixo disso) e foco ao abrir. A consulta fica no endereço
  (`?q=`), então voltar de um versículo reencontra a busca.
- **Links internos sem recarregar.** `AppLink` navega dentro do app a partir de um endereço completo;
  os `<a href>` internos que recarregavam a página (e repetiam a abertura) passaram a usá-lo.

## Referências digitadas: uma regra para o site e o Android — 2026-10-21

O site e o Android leem a referência digitada com as mesmas regras: nome, abreviação ou nome em
inglês, com ou sem acento e espaço ("Jo3:16", "joao 3,16", "1Co13:4-7", "I Coríntios 13:4",
"Sl 119"), e recusam capítulo inexistente, versículo 0 ou intervalo invertido. No site,
`parseScriptureReference` (`src/lib/application/scripture-reference.ts`) é a mesma lógica de
`ReadingNavigation.parse` no Android.

Os exemplos ficam num só arquivo, `src/lib/application/scripture-reference.cases.json`, lido pelos
testes dos dois lados (`scripture-reference.test.ts` e `ReadingNavigationTest.kt`). Um caso novo
entra ali, nunca em só um dos testes; se um lado mudar a regra sem o outro, o teste dele falha. O
CI do Android também roda quando esse arquivo muda.

O mesmo vale para **onde cada nota aparece**. `noteTargets` (`src/lib/domain/note-placement.ts`)
decide se uma nota vai sob os versículos que cobre, para o contexto do capítulo (fala do capítulo
ou do livro inteiro) ou para lugar nenhum (menção de dicionário). O site usa essa função direto, e
o exportador do celular grava exatamente esses alvos, que o Android compara do mesmo jeito. Os casos
ficam em `src/lib/domain/note-placement.cases.json`. Com isso, notas sobre o capítulo ou o livro
inteiro passaram a aparecer no "Panorama do capítulo" do site, nos modos resumido e completo, como
já apareciam no topo do capítulo no Android; antes só apareciam na lista do painel lateral.
