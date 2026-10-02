# Motor semântico de conteúdo

## Objetivo

Transformar documentos privados pesquisáveis em unidades pequenas e auditáveis que possam ser
relacionadas a passagens, disciplinas e, futuramente, entidades do grafo de conhecimento. O motor
não resume um livro inteiro em uma resposta nem converte interpretação em fato.

## Fluxo operacional

```text
PDF privado no OPFS
  -> páginas extraídas no workspace SQLite
  -> segmentos com offsets na página
  -> classificações controladas por domínio
  -> referências bíblicas candidatas
  -> revisão humana
  -> vínculo aceito visível no inspetor da passagem
```

O primeiro analisador é `deterministic-pt-en-1`. Ele separa blocos, conserva offsets e checksum,
reconhece marcadores controlados em português/inglês e resolve referências bíblicas em ambos os
idiomas. Esta camada deliberadamente simples fornece baseline reproduzível para comparar futuros
extratores mais sofisticados.

## Book Decomposition Pipeline v1

A desmontagem de livros privados acrescenta uma camada acima dos blocos de página:

```text
PDF privado
  -> nós estruturais (livro/parte/capítulo/seção/bibliografia)
  -> unidades semânticas com um ou mais spans físicos
  -> propostas tipadas de conhecimento
  -> revisão humana
  -> agregação privada
  -> exportação editorial explícita
```

`DocumentKnowledgeAnalyzer` é o contrato substituível. A implementação inicial,
`deterministic-document-knowledge:2`, detecta estrutura, reúne continuações simples entre páginas e
propõe assuntos, referências bíblicas, afirmações, argumentos, citações e entidades de um
vocabulário controlado. A versão 2 classifica claims por sinais linguísticos, textuais, históricos,
filosóficos, teológicos e exegéticos e conserva qualificadores de negação, atribuição e modalidade;
isso continua sendo classificação heurística, não compreensão autônoma de autoria ou correferência.
Heurísticas e escores medem somente a força do padrão que disparou a
proposta; não medem verdade, importância ou concordância teológica.

As tabelas `document_nodes`, `semantic_units`, `semantic_unit_spans` e `knowledge_proposals` ficam
exclusivamente no workspace privado. Uma unidade pode conservar vários spans de página, de modo que
uma frase interrompida pela paginação continue citável sem apagar a localização física. IDs de
propostas incluem fingerprint do payload; reprocessar o mesmo livro não cria duplicatas e preserva
decisões humanas quando a proposta permanece semanticamente igual.

Propostas começam como `machine-proposed`. Aceitar ou rejeitar é uma decisão local do pesquisador.
A exportação `scriptorium-private-knowledge-export-v1` contém somente a estrutura e as propostas
aceitas, permanece marcada como `localOnly` e `requiresRightsReview`, e não é importada
automaticamente em `content/packs` nem em `public/knowledge`.

### Ponte livro → passagem

Uma relação bíblica aceita não é mais somente um marcador isolado. O
`WorkspacePassageKnowledgeService` resolve a relação para sua unidade citável, reúne as demais
propostas aceitas da mesma unidade, a tradução local disponível e as páginas físicas. O Passage
Inspector apresenta essa camada como **conhecimento privado**, separada do snapshot curado e sem
copiar o texto do livro para o banco público.

O resolvedor aceita referências completas em português/inglês, continuação compacta no mesmo
capítulo (`João 1:1, 3-5`) e referências relativas (`vv. 3-5`) quando existe contexto bíblico
explícito. Ele valida capítulo por livro e limites estruturais básicos; não substitui um índice
canônico exato de quantidade de versículos por capítulo.

### Cobertura e promoção editorial

Cada passagem expõe uma matriz que distingue conteúdo curado, conteúdo privado aceito e lacuna em
15 áreas: texto, crítica textual, linguística, exegese, hermenêutica, contexto histórico, política,
arqueologia, geografia, tradição, teologia, soteriologia, escatologia, recepção e correntes
religiosas. Ausência permanece `missing`; uma simples proposta pendente não conta como cobertura.

Claims e argumentos podem receber um perfil de perspectiva durante a revisão. O pacote
`scriptorium-editorial-staging-v1` é somente uma pré-promoção: `publicationAllowed` é sempre falso.
Ele bloqueia material privado sem decisão documentada de direitos ou sem vínculo/evidência e avisa
sobre perspectivas ausentes e traduções não revisadas. Não existe escrita automática em
`public/knowledge`.

## Persistência

A migration 010 acrescenta:

- `semantic_document_indexes`: versão, checksum, estado e contagens da execução;
- `semantic_segments`: página, offsets, tipo estrutural, idioma e checksum;
- `semantic_segment_domains`: domínio, evidência textual, método e revisão;
- `semantic_passage_links`: endereço com versificação, relação, método e revisão;
- `local_translations`: cache local por origem, checksum, idioma e modelo.

A migration 011 acrescenta:

- `document_knowledge_indexes`: versão do analisador, estado e contagens da desmontagem;
- `document_nodes`: hierarquia estrutural proposta para o livro;
- `semantic_units` e `semantic_unit_spans`: unidades citáveis e suas âncoras físicas;
- `knowledge_proposals`: candidatos tipados, editáveis e revisáveis.

A migration 012 fixa a revisão do modelo na identidade do cache de tradução e amplia o vocabulário
de domínios para história social/política, tradição, soteriologia, escatologia e correntes
religiosas.

A migration 013 torna o pipeline de desmontagem a única fonte de verdade usada pela aplicação.
Relações e domínios já aceitos no motor legado são convertidos em `semantic_units` e
`knowledge_proposals` com revisão preservada; as tabelas antigas permanecem apenas como janela de
compatibilidade e não são consultadas pelo Reader. A mesma migration cria
`private_translation_jobs`, que registra lotes pausados, concluídos ou falhos. O índice grava
progresso de leitura por página durante uma nova execução e contagens são recalculadas do banco ao
concluir, incluindo unidades legadas migradas.

O texto do segmento não é duplicado: ele é reconstruído pelos offsets da página privada. Exclusão
do documento remove os derivados por foreign keys. Reindexação apaga somente os derivados daquele
documento e recomeça dentro do mesmo workspace local.

## Domínios controlados

Exegese, hermenêutica, teologia, contexto e história social/política, arqueologia, geografia,
crítica textual, linguística, patrística, liturgia, tradição, soteriologia, escatologia, correntes
religiosas, filosofia da religião, ciência e `other`. Esses rótulos organizam material; não afirmam
autoria, qualidade acadêmica ou concordância com uma tradição.

## Repertórios avaliados

- **Sefaria**: APIs de textos relacionados, tópicos e léxicos inspiram a separação entre texto,
  relação e índice, sem importar sua ontologia como se fosse universal.
- **ETCBC/BHSA + Text-Fabric**: referência forte para features linguísticas hebraicas e consulta em
  grafo; a licença CC BY-NC exige avaliação separada antes de qualquer redistribuição.
- **Open Scriptures morphhb/Strong's**: candidatos para ampliar identidades lexicais e definições,
  sempre por artefato, licença e proveniência.
- **Concord**: referência de engenharia para construir concordância bíblica a partir de fontes
  reproduzíveis.
- Repositórios do próprio usuário: `tsf-career-unified` contribuiu o padrão conceitual
  `SYSTEM_EXTRACTED -> revisão explícita`; `Resume-Matcher`, validação estruturada de saída e
  provider substituível. Nenhum código ou histórico foi copiado automaticamente.

## Processamento incremental e retomada

O analisador determinístico processa no máximo 50 páginas por lote. Depois de cada lote, o runtime
persiste nós, unidades, propostas e um checkpoint que contém os próximos ordinais, a quantidade de
caracteres processada e o contexto hierárquico atual (parte, capítulo e seção). Se o processo falhar,
a próxima execução com o mesmo checksum, analisador e versão retoma da primeira página ainda não
confirmada, sem carregar novamente o livro inteiro.

As gravações derivadas usam IDs determinísticos e `INSERT OR IGNORE`. Assim, uma interrupção entre
a escrita de um lote e a atualização do checkpoint pode repetir o lote sem duplicar resultados. O
checkpoint só avança depois que todas as entidades do lote foram gravadas. A contagem final é lida
novamente do banco.

Continuações de parágrafo são reunidas dentro de cada lote. Uma continuação exatamente na fronteira
entre dois lotes permanece dividida em duas unidades citáveis, sem perder os offsets das páginas.
Providers opcionais que implementem apenas `analyze()` continuam compatíveis, mas usam o caminho
legado em memória e não oferecem retomada. Para obter as garantias incrementais, o provider deve
implementar `analyzeBatch()` e devolver seu checkpoint serializável.

## Próximos incrementos seguros

1. melhorar detecção de notas e entradas bibliográficas em edições variadas;
2. acrescentar analisadores locais opcionais sob o mesmo contrato de propostas;
3. OCR/EPUB local;
4. embeddings opcionais como mecanismo de recuperação, nunca como substituto de proveniência;
5. converter o pacote editorial aprovado em `Claim`/`Evidence`/`Argument` curado por uma ferramenta
   separada, com decisão de direitos registrada e revisão de dois passos.
