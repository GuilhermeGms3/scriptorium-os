# Scriptorium OS

O Scriptorium é um sistema local-first para leitura bíblica, investigação textual e organização de conhecimento. O projeto mantém texto, edição, esquema de referência, evidência, interpretação, tradição, método, teoria e proveniência como conceitos distintos.

## Arquitetura

- React 19, TanStack Start/Router, Vite 8 e TypeScript estrito na interface.
- Pacotes de corpus SQLite divididos por obra, verificados por SHA-256, instaláveis em Cache API e carregados sob demanda por SQLite WASM.
- FTS5 para busca textual; componentes React acessam repositórios e serviços, nunca SQL.
- Identidade textual estável, independente da numeração humana, e crosswalks explícitos N:M.
- Ontologia teológica multidimensional e grafo de argumentos persistidos em SQLite.
- Source Engine com Author/Work/Edition/Source, citações estruturadas e importação CSL-JSON, RIS e um subconjunto básico de BibTeX.
- Workspace pessoal persistente em SQLite/OPFS, separado dos corpora imutáveis, com exportação e reimportação JSON.
- Motor semântico local para reconstruir a estrutura de documentos privados, manter unidades citáveis multi-página e propor assuntos, vínculos bíblicos, claims, argumentos, citações e entidades submetidos a revisão humana.
- Camada privada por passagem que reúne unidades aceitas, claims, assuntos, páginas e traduções e mede lacunas em 15 áreas de conhecimento.
- Promoção editorial em dois passos, com pacote de staging bloqueado por direitos/evidência e sem escrita automática no conhecimento público.
- Serviço Python opcional para tradução local inglês→português e análise contextual em lotes,
  sempre mantendo original, checkpoint, proveniência e estado de revisão.
- Artefatos de origem, checksums, direitos e transformações preservados pelo pipeline.

Os bancos gerados ficam em `public/corpus-packages/` e `public/knowledge/`. Eles não são importados nos chunks JavaScript do Vite; o Reader abre o shard da obra necessária, a busca usa shards FTS compactos e a concordância usa um índice linguístico global separado. O workspace mutável fica no OPFS do navegador e nunca é enviado a um backend.

## Desenvolvimento

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
npm run preview
```

No Windows, os comandos `semantic:*` procuram a `.venv` e depois `py -3.13`; assim, uma instalação
antiga chamada apenas `python` no `PATH` não mascara o Python 3.13.3. Consulte o
[README do motor semântico](services/semantic-engine/README.md).

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
leitura. Os corpora são servidos pela imagem; estudos, notas e documentos
privados permanecem no OPFS do navegador, não em um volume Docker. Ao publicar
em outro computador ou domínio, use HTTPS no proxy reverso: fora de `localhost`,
o navegador pode negar OPFS em uma origem HTTP e o Scriptorium cairá para o
armazenamento temporário sinalizado pela interface.

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

O pipeline opcional de livros agora inclui recuperação de páginas vazias por OCR local,
preservação de geometria, candidatos FTS/vetoriais, inferência via LM Studio/llama.cpp,
retomada e auditoria por livro. Configuração e limites efetivos:
[pipeline local de conhecimento](docs/architecture/local-knowledge-pipeline.md).
Modelos, Tesseract e validação funcional não são instalados/executados automaticamente.

O Content Seed v0.1 e o pacote Phase 10 v0.2 incluem uma vertical source-backed de João 1:1–18, bibliografia real do problema sinótico, TBESG completo e o WLC/OSHB 2.2 completo. Conteúdo machine-assisted permanece rotulado como rascunho, e documentos históricos sem edição digital redistribuível verificada continuam metadata-only. PDFs privados com camada textual podem ser importados em lote, ter idioma detectado, ser indexados, segmentados e vinculados localmente; uma falha ou PDF escaneado não interrompe os demais arquivos. Nada disso integra os pacotes redistribuíveis. Nag Hammadi possui catálogo integral, mas somente o Evangelho de Tomé copta está instalado. O projeto ainda não inclui Septuaginta, aparato crítico, tradução portuguesa licenciada de Nag Hammadi, RAG, EPUB/OCR ou alinhamento português↔grego/hebraico.
