# Exploração horizontal dos versículos

Implementação web/desktop de 27/10/2026, autorizada a partir do desenho de linhas
independentes enviado pelo usuário. A leitura contínua permanece como entrada padrão.
Não substitui a árvore de Estudos nem implementa o compositor de sessões proposto em
`reading-composer-proposal.md`.

## Uso

Nas Escrituras, escolha **Explorar versículos** na barra superior, entre a navegação
da passagem e os controles de versão. O acesso vale para todos os livros e capítulos
com texto carregado; nos outros modos ele retorna à Leitura e abre a exploração.
Cada versículo fica à esquerda de sua própria sequência horizontal. Arraste
com o mouse, use o trackpad, os controles de direção ou foque o caminho e pressione
setas/Home/End. Os botões também são acessíveis por Tab e Enter.

Blocos pequenos apresentam categoria, título e indicação da fonte. Azul identifica
texto/linguagem; verde, contexto; bronze, interpretação; violeta, investigação pessoal.
Ícones e textos acompanham as cores. Temas claros/escuros usam tons distintos.
Não há sequência obrigatória de categorias, preenchimento artificial nem limite que
descarte os demais comentários. As ligações organizam a consulta: não demonstram
dependência lógica, consenso ou relação causal entre as fontes.

O modo se aplica ao capítulo carregado e a todos os demais capítulos que tenham
material disponível. A quantidade de blocos varia por versículo. Referências de busca,
marcação, impressão, áudio, leitura original e comentário no painel permanecem nos
fluxos existentes. A opção não aparece no celular; não há mudança no Android.

## De onde vem o conteúdo

`buildVerseExploration`, em `src/lib/domain/verse-exploration.ts`, projeta o bundle
existente e os dados já retornados por `WorkspacePassageKnowledgeService.load`:

- Comentários contextualizados da biblioteca, respeitando os destinos explícitos.
  Uma detecção de referência sem análise contextual não vira comentário. Esses outros
  vínculos continuam disponíveis no inspetor e na Biblioteca.
- Análises com texto, excluindo placeholders e camadas demonstrativas.
- Afirmações ancoradas explicitamente à passagem, com o estado de revisão original.
- Palavras da edição original efetivamente instalada; não inventa glosas ou definições.
- Notas pessoais com âncora estruturada ao versículo ou intervalo correspondente.

Notas amplas ficam no panorama do capítulo, seguindo a política de apresentação já
existente. Trechos da mesma fonte/categoria são reunidos num bloco: a janela oferece
um seletor de todos os trechos, com páginas e títulos. Não há cópia nem alteração dos
registros originais. Os filtros existentes de fonte/contexto/assunto continuam aplicados
à biblioteca privada; não reclassificam automaticamente análises públicas ou léxico.

Uma classificação explícita do acervo decide a categoria, não palavras encontradas no
título de um livro. Isso também significa que classificações e vínculos automáticos
podem conter erros: a interface conserva o aviso de proveniência e os limites da fonte.
Este recurso não é uma nova revisão acadêmica do acervo nem cria material arqueológico,
antropológico ou contrapontos onde ainda não foram registrados.

## Janela de aprofundamento e caderno

`verse-exploration-detail.tsx` apresenta o texto disponível, autoria quando registrada,
fonte/página ou localizador, relação com a passagem, limites e contrapontos documentados
quando disponíveis. Uma fonte meramente bibliográfica não é anunciada como livro
integral instalado. O texto confessional mantém sua atribuição e não vira consenso.

**Ler fonte e anotar** abre o leitor contextual existente, preservando documento,
unidade e página. No texto original, escolher uma palavra abre o inspetor lexical.
A janela também permite uma nota rápida: `Workbench.addNote` grava no repositório
canônico, com âncora do versículo exato e referências às fontes disponíveis. A nota
reaparece como bloco da investigação e pode ser editada no caderno. Para captura com
origem/página/seleção integral, utilize o editor do leitor contextual.

O rascunho não é salvo automaticamente. Fechar, sair ou abrir uma fonte solicita
confirmação quando há texto pendente; uma falha de salvamento preserva o texto. O foco
volta ao bloco de origem, inclusive após abrir e fechar o leitor contextual.

## Limites técnicos

- Sem nova dependência, API, migration, segunda base ou serviço de IA.
- Uma projeção por capítulo, memoizada; nenhuma consulta adicional por versículo.
- A integração reutiliza as consultas e políticas de publicação vigentes; não promove
  propostas, não confirma relações e não altera o processamento das Bíblias comentadas.
- Não há garantia de cobertura igual em todos os versículos ou em todas as categorias.
- QA e evidências: `docs/qa/verse-exploration-2026-10-27.md`.
