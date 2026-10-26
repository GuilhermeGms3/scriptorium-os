# Scriptorium OS

O Scriptorium é um sistema local-first para leitura bíblica, investigação textual e organização de conhecimento. O projeto mantém texto, edição, esquema de referência, evidência, interpretação, tradição, método, teoria e proveniência como conceitos distintos.

## Arquitetura

- React 19, TanStack Start/Router, Vite 8 e TypeScript estrito na interface.
- Pacotes de corpus SQLite divididos por obra, verificados por SHA-256, instaláveis em Cache API e carregados sob demanda por SQLite WASM.
- FTS5 para busca textual; componentes React acessam repositórios e serviços, nunca SQL.
- Identidade textual estável, independente da numeração humana, e crosswalks explícitos N:M.
- Ontologia teológica multidimensional e grafo de argumentos persistidos em SQLite.
- Source Engine com Author/Work/Edition/Source, citações estruturadas e importação CSL-JSON, RIS e um subconjunto básico de BibTeX.
- Workspace pessoal separado dos corpora imutáveis: SQLite nativo na instalação local e OPFS no modo navegador, com exportação e reimportação estrutural JSON.
- Motor semântico local para reconstruir a estrutura de documentos privados, manter unidades citáveis multi-página e propor assuntos, vínculos bíblicos, claims, argumentos, citações e entidades submetidos a revisão humana.
- Orquestrador resumível da biblioteca privada, auditoria inferencial por lotes e relatório de cobertura por documento, passagem e área de estudo.
- Camada privada por passagem que reúne unidades aceitas, claims, assuntos, páginas e traduções e mede lacunas em 15 áreas de conhecimento.
- Promoção editorial em dois passos, com pacote de staging bloqueado por direitos/evidência e sem escrita automática no conhecimento público.
- Serviço Python opcional para tradução local inglês→português e análise contextual em lotes,
  sempre mantendo original, checkpoint, proveniência e estado de revisão.
- Artefatos de origem, checksums, direitos e transformações preservados pelo pipeline.

Os bancos gerados ficam em `public/corpus-packages/` e `public/knowledge/`. Eles não são importados nos chunks JavaScript do Vite; o Reader abre o shard da obra necessária, a busca usa shards FTS compactos e a concordância usa um índice linguístico global separado. O workspace mutável usa OPFS no modo navegador ou SQLite nativo em `data/workspace/` na instalação local. Consulte [acervo da instalação](docs/architecture/installation-workspace.md).

O [leitor contextual e caderno](docs/architecture/study-notebook.md) permite abrir fontes sem sair
da passagem. **Notas** possui acesso próprio, pastas/subpastas, editor de página em abas, links
internos, referências recebidas e mapa pessoal colorido, usando esse mesmo banco. Salve pelo
botão ou Ctrl+S; as capturas de fontes continuam ligadas às passagens e aos estudos existentes.

A [Busca ampliada](docs/architecture/external-academic-search.md) conserva texto/referências e
busca por sentido, acrescentando consultas explícitas ao OpenAlex e caminhos para Google,
Google Acadêmico e bibliotecas. Resultados externos são separados do conhecimento instalado.

Os [espaços de estudo por tema](docs/architecture/study-topic-workspace.md) conectam a árvore a
leituras reais do acervo, percursos, notas e relações pessoais, com uma área opcional para a API
do YouTube. As fontes são consultadas sob demanda, sem conteúdo fictício para preencher lacunas.

A [incorporação documental por tema e verbete](docs/architecture/thematic-source-incorporation.md)
publica recortes rastreáveis no workspace existente, sem confundir seção temática com comentário
de versículo. O [balanço de 22/10/2026](docs/content/thematic-expansion-2026-10-22.md) distingue
conteúdo incorporado, auditoria estrutural e frentes ainda pendentes.

O percurso [Queda, graça e providência](docs/content/queda-graca-providencia-2026-10-26.md),
em Estudos → Percursos no Android e na web, acrescenta 14 módulos sobre condição humana,
cinco vias, morte e ressurreição, graça, providência e tradições cristãs. As hipóteses
de leitura ficam diferenciadas das fontes e dos contrapontos confessionais.

A [fila contextual de 24/10/2026](docs/content/contextual-library-expansion-2026-10-24.md)
reutiliza os extratores e importadores canônicos, com retomada, staging e bloqueios por
tipo documental. O relatório distingue os novos recortes, comentários e tentativas OCR.

## Desenvolvimento

A [recuperação OCR em fila](docs/architecture/offline-ocr-recovery.md) processa os PDFs já
instalados sem texto, com retomada por página, backup e publicação no workspace existente.
Texto recuperado não equivale a comentário bíblico contextualizado ou revisado.

O [Scriptorium Áudio](docs/architecture/scriptorium-audio.md) permite ouvir capítulos,
versículos/intervalos e texto pessoal com vozes locais reais do dispositivo. O mini player
continua entre rotas; progresso e histórico são preferências locais, sem copiar o acervo.
Esta fundação web não gera arquivos nem habilita provedores pagos. O
[Áudio Android nativo](docs/architecture/audio-android.md), em0.6.1, implementa leitura local,
MediaSession/segundo plano e ambientação sem substituir o motor web nem o acervo.
Reflexões Android acrescenta autoria manual, revisão e coleção local; voz neural expressiva,
roteiros por IA e produção cinematográfica multiplataforma ainda não estão implementados.
O incremento [Música e Ambiente](docs/architecture/audio-ambience.md) permite importar uma trilha
local e ouvir voz, voz com música ou somente música. Essas cópias pertencem ao navegador/origem,
não ao backup do acervo ou à imagem Docker; não há exportação mixada nesta etapa.

O aplicativo nativo Android está em [android/](android/README.md), com Kotlin/Compose e
pacotes offline exportados pelo PC, inclusive [kit privado com aplicativo e todos os PDFs](docs/architecture/mobile-consumption.md).
Leitura, comparação/interlinear, léxico, fontes, Rastro, estudos e notas têm interfaces nativas;
a [matriz de paridade](android/README.md#implementado-e-restante) distingue
o que está funcional do que ainda precisa ser portado. Não inclui o pipeline de produção no celular.

Requer Node.js 22 ou superior.

```bash
npm install
npm run corpus:build
npm run corpus:build -- wlc
npm run corpus:index
npm run content:fetch:lexicon
npm run content:fetch:theology
npm run dev
```

Comandos de validação:

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run benchmark:corpus
npm run semantic:test
npm run semantic:typecheck
npm run semantic:lint
npm run preview
```

No dia a dia, `npm run test:quick` roda tudo menos os cinco arquivos que leem os corpora
(TAGNT, Bíblia Livre, SBLGNT, motor de conhecimento e runtime SQLite) e não reconstrói o índice
antes: cerca de 35 s. `npm test` roda todos; como os testes de corpus levam vários segundos cada no
Windows, o limite por teste é de 60 s.

`npm run dev` fixa deliberadamente a origem local em `http://127.0.0.1:5173`.
Sem `SCRIPTORIUM_WORKSPACE_DIR`, o workspace privado usa OPFS e pertence à origem
completa do navegador; trocar host, protocolo ou porta cria outro armazenamento.
Na instalação local, configure essa variável em `.env.local` apontando para
`data/workspace/`: o backend compartilha o mesmo acervo entre navegadores.
Docker já monta essa pasta automaticamente; previews no Cloudflare
continuam no modo navegador, sem habilitar o backend nativo implicitamente.

No Windows, os comandos `semantic:*` procuram a `.venv` e depois `py -3.13`; assim, uma instalação
antiga chamada apenas `python` no `PATH` não mascara o Python 3.13.3. Consulte o
[README do motor semântico](services/semantic-engine/README.md).
O serviço tem lock de dependências (`uv.lock`), migração segura para vetores float32, glossário
teológico versionado e busca híbrida opcional. O inspetor de palavras mostra distribuição por
livro e vizinhos nos corpora grego/hebraico. Operação e medições:
[busca semântica e estatísticas](docs/architecture/semantic-search-vectors-lexical-statistics.md).

## Docker

O build local usa o preset Nitro `node-server` e gera uma imagem autônoma com
Node.js 22. Para construir e iniciar:

```bash
docker compose up --build -d
```

Abra `http://localhost:3000`. Para parar:

```bash
docker compose down
```

Para iniciar também o tradutor local (o primeiro uso baixa o modelo inglês→português):

```bash
docker compose --profile semantic up --build -d
```

O container executa como usuário sem privilégios e com filesystem somente
leitura, exceto a pasta persistente `data/workspace` montada no container. Estudos,
notas, PDFs e ligações ficam nessa pasta, compartilhados entre navegadores. Esse
modo é local e single-user, restrito a loopback; não é um servidor pronto para
internet/LAN. Não execute Vite/Windows e Docker/Linux escrevendo ao mesmo tempo
no banco montado. Para transportar o acervo, faça backup privado da pasta com o
runtime parado. Git e a imagem Docker levam o código, não os livros privados.

Os índices grandes de corpus permanecem ignorados e são reconstruídos por
`npm test` e `npm run build`. O snapshot curado e leve
`public/knowledge/knowledge.sqlite3` é versionado para que um clone possa
inspecionar imediatamente o grafo atual; `npm run corpus:index` também o
reproduz deterministicamente. `npm run db:migrate` aplica as migrations por
meio dessa reconstrução.

## Corpora e dados

Fontes imutáveis ficam em `corpora/source/`; derivados normalizados, em `generated/corpora/`. O pipeline valida direitos, proveniência e SHA-256 antes da publicação. JSON continua sendo aceito como artefato de origem/intermediário, mas o runtime consulta SQLite.

A Biblioteca também inclui pacotes SQLite/FTS legíveis de sete obras dos Pais Apostólicos, cinco credos/documentos conciliares históricos, os livros I–II do comentário de Orígenes sobre João, o Evangelho de Tomé em copta, as Confissões de Agostinho e as quatro partes da Suma Teológica em edições históricas inglesas. Consulte [Pais Apostólicos](docs/content/apostolic-fathers.md), [credos](docs/content/creeds-confessions.md), [recepção de João 1](docs/content/john-reception.md), [biblioteca teológica](docs/content/theological-library.md) e [cobertura de conteúdo](docs/content/content-coverage.md).

Consulte [docs/corpora/README.md](docs/corpora/README.md) para aquisição e geração, [docs/corpora/phase10-content.md](docs/corpora/phase10-content.md) para a expansão de conteúdo, [docs/architecture/text-identity.md](docs/architecture/text-identity.md) para a base arquitetural da Fase 8, [docs/architecture/phase9-5-consolidation.md](docs/architecture/phase9-5-consolidation.md) para o runtime canônico, [docs/architecture/private-document-ingestion.md](docs/architecture/private-document-ingestion.md) para a ingestão local de PDFs, [docs/architecture/semantic-content-engine.md](docs/architecture/semantic-content-engine.md) para a desmontagem e linkagem e [docs/architecture/local-translation.md](docs/architecture/local-translation.md) para o tradutor opcional.

## Limites atuais

O extrator offline especializado em notas de Bíblias comentadas está descrito em
[extração de comentários originais](docs/architecture/original-commentary-extraction.md).
Ele produz lotes privados, preserva comentários anteriores e separa o destino principal das
comparações/menções no corpo. Não depende de LLM nem equivale a cobertura editorial integral.

Em **Rastro → Aproveitamento do acervo**, o relatório local distingue extração, unidades,
ligações, contextos disponíveis e auditorias, com filtros por obra e passagem. Confira os
[pilotos lexicais, correções e limites da auditoria](docs/content/acervo-utilization-audit-2026-10-21.md).

A [fila local de incorporação](docs/architecture/library-import-queue.md) permite importar e
desmontar novos PDFs num worker independente do chat, com backup, lock e retomada. Use
`library:enqueue`, `library:run` e `library:status`; EPUB/OCR e revisão contextual têm estados
e limites explícitos, sem apresentar referências detectadas como comentários aprovados.

O primeiro trabalho de leitura contextual das Bíblias privadas está registrado em
[comentários das Bíblias privadas](docs/content/contextual-bible-reading.md), com fontes,
páginas, lotes realmente incorporados e limites de cobertura. Referências automáticas
não são apresentadas como se fossem comentários de cada versículo.

O especialista de [contextos patrísticos e confessionais](docs/architecture/patristic-confessional-context.md)
preserva conferência/parágrafo/artigo, distingue exegese de texto-prova e reutiliza o mesmo
importador privado. Os perfis são calibrados por edição, não um entendimento universal de PDFs.

O especialista de [comentários intertextuais, homilias e manuais](docs/architecture/outlined-source-contexts.md)
trata Beale/Carson, Crisóstomo/Mateus e MacArthur com alcances distintos. O painel direito
mostra contexto histórico/geográfico e mapas reais, com página, fonte e carregamento sob demanda.

O pipeline opcional de livros agora inclui recuperação de páginas vazias por OCR local,
preservação de geometria, candidatos FTS/vetoriais, inferência multialvo via LM Studio/llama.cpp,
retomada da biblioteca inteira, auditoria amostral por lote, cobertura e conteúdo privado inline.
Configuração e limites efetivos:
[pipeline local de conhecimento](docs/architecture/local-knowledge-pipeline.md).
Modelos, Tesseract e validação funcional não são instalados/executados automaticamente.

O Content Seed v0.1 e o pacote Phase 10 v0.2 incluem uma vertical source-backed de João 1:1–18, bibliografia real do problema sinótico, TBESG completo e o WLC/OSHB 2.2 completo. Conteúdo machine-assisted permanece rotulado como rascunho, e documentos históricos sem edição digital redistribuível verificada continuam metadata-only. PDFs privados, inclusive escaneados, podem ser importados em lote, ter idioma e perfil detectados, ser indexados, segmentados e vinculados localmente; OCR é uma etapa local opcional e sua indisponibilidade não interrompe os demais arquivos. Nada disso integra os pacotes redistribuíveis. Nag Hammadi possui catálogo integral, mas somente o Evangelho de Tomé copta está instalado no corpus público; volumes privados permanecem no workspace do proprietário. O projeto ainda não inclui Septuaginta, aparato crítico, tradução portuguesa redistribuível de Nag Hammadi, RAG, EPUB ou alinhamento português↔grego/hebraico.
