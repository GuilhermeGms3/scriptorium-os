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

