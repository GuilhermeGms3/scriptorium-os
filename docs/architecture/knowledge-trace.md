# Rastro do conhecimento privado

`/trace` é uma consulta dinâmica sobre o mesmo workspace SQLite/OPFS usado pelo leitor e pelo
pipeline. Não é um catálogo estático nem outro motor de conhecimento. O módulo não analisa livros
por conta própria e não transforma citações detectadas em comentários exegéticos.

## Fluxo

Sidebar ou cartão de conhecimento do versículo → filtros de fonte, livro, capítulo, versículo,
esquema e estado → ligação → justificativa/evidência → página original e histórico.

As consultas retornam até 40 ligações por página, com um registro extra para detectar continuação.
Migration 021 adiciona índices parciais de ordem global e por documento. A listagem seleciona
explicitamente esses índices, evitando que estatísticas ausentes levem SQLite ao índice antigo
de endereço e a uma ordenação temporária de todas as propostas.
Somente ao abrir uma ligação a unidade citável é reconstruída. Capítulos, livros, intervalos e
destinos adicionais são consultados no SQL; esquemas não são equiparados silenciosamente.
Sem filtro de esquema, resultados de diferentes esquemas permanecem identificados individualmente.
O leitor continua resolvendo a passagem em sua edição: o link de navegação não constitui crosswalk.

`KnowledgeTraceRepository` consulta propostas, decisões, fontes e spans canônicos.
`KnowledgeTraceService` interpreta somente razões/evidências realmente armazenadas. Sem rationale
contextual, informa a ausência; referência explícita detectada não é justificativa semântica inventada.
Estado de visibilidade segue a precedência existente no leitor: aceitação individual, rejeição
individual, depois publicação pelo pipeline. A auditoria de lote não é apresentada como leitura
humana individual nem prova de verdade.

## Histórico persistente — migration 020

`knowledge_trace_events` recebe snapshots de ligações bíblicas por triggers transacionais:

- registro de proposta;
- correção de referência, método ou revisão;
- decisão/publicação, mudanças de evidência/configuração, auditoria e revogação;
- remoção durante reprocessamento.

O backfill cria **estado inicial observado** na data da migration, nunca histórico retroativo.
Atualizações apenas de timestamp não geram eventos. Texto integral do PDF não é duplicado nos
eventos; payload, estado e evidência podem conter trechos privados e permanecem privados.
Eventos retêm o identificador antigo quando propostas/unidades são reconstruídas. Não possuem FK
para a proposta por esse motivo; possuem FK para o documento. Excluir o documento elimina seu
histórico em cascata. A lista mostra ligações atuais; um URL anteriormente guardado pode consultar
o histórico da ligação removida. O detalhe exibe os 100 eventos mais recentes; o backup contém todos.

`knowledge_trace_control` suspende captura somente dentro da transação de restore com histórico.
O backup v3 adiciona `traceEvents` opcional, mantendo os backups anteriores válidos e respectivos
checksums. Restore repetido não fabrica eventos nem duplica IDs; rollback também restaura a captura.
Backups antigos não têm fatos históricos que possam ser recuperados. PDFs/páginas continuam fora
do backup: precisam ser reimportados para reidratar o texto original.

## Atualização e limites

Não há cache próprio. Eventos `scriptorium:knowledge-changed` recarregam consultas com debounce e
descartam respostas antigas. SSR não inicializa o banco; consultas começam no efeito do cliente.
Não há serviços externos, dependências novas nem envio de livros ao servidor.

O módulo torna os registros existentes auditáveis; não significa que as dezenas de milhares de
páginas tenham sido lidas contextual e integralmente por um modelo. Essa operação editorial deve
alimentar propostas e evidências canônicas, com identificação verdadeira do método e revisão.

## Integração de perfis e leitura contextual

A integração de `melhoria/confiabilidade-perfis` preserva os campos opcionais `referenceZone`,
`referenceRole` e `contextualAnalysis` no mesmo payload canônico. Papéis lexicais/intertextuais
organizam o inspetor; não transformam uma ocorrência em comentário. Corrigir o perfil não
reprocessa silenciosamente o acervo: as novas heurísticas entram quando o livro é reprocessado.

O importador recolhido no Rastro recebe lotes privados `scriptorium-contextual-reading-v1` e valida
checksum da fonte, página física e trecho literal (tolerando somente diferenças de whitespace)
antes de uma transação única. Reimportações idênticas preservam as revisões individuais. A análise
fica identificada como assistida por máquina, nunca como revisão humana. Não há leitura integral
automática do acervo pela existência desse importador.

Limite de segurança: a reconstrução estrutural de um livro com `contextualAnalysis` é recusada
antes de apagar unidades. A reconciliação dos spans contextuais com uma nova desmontagem ainda
precisa ser implementada; não se deve perder notas/revisões para aplicar um novo perfil. Livros
sem essas notas continuam usando o reprocessamento existente.

O backup estrutural remove citações da evidência operacional, mantendo a análise contextual no
payload. O Rastro usa sua justificativa canônica quando a evidência foi redigida no backup.
O arquivo ainda pode conter análises, propostas e traduções privadas: não é um pacote público
redistribuível e não substitui o backup dos PDFs/páginas originais. A integração não executa
reprocessamento, importação contextual ou alterações editoriais no workspace real.

Migration aditiva: não altera textos, propostas ou decisões existentes. Rollback requer backup e
remoção dos cinco triggers, duas tabelas e entrada de versão 20; nunca executar automaticamente,
pois removeria o histórico capturado.
