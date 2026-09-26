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
npm run preview
```

`npm test` e `npm run build` reconstroem os índices para que um clone limpo não dependa de bancos locais ignorados. `npm run db:migrate` aplica as migrations por meio da reconstrução determinística dos pacotes.

## Corpora e dados

Fontes imutáveis ficam em `corpora/source/`; derivados normalizados, em `generated/corpora/`. O pipeline valida direitos, proveniência e SHA-256 antes da publicação. JSON continua sendo aceito como artefato de origem/intermediário, mas o runtime consulta SQLite.

A Biblioteca também inclui pacotes SQLite/FTS legíveis de sete obras dos Pais Apostólicos, cinco credos/documentos conciliares históricos, os livros I–II do comentário de Orígenes sobre João, o Evangelho de Tomé em copta, as Confissões de Agostinho e as quatro partes da Suma Teológica em edições históricas inglesas. Consulte [Pais Apostólicos](docs/content/apostolic-fathers.md), [credos](docs/content/creeds-confessions.md), [recepção de João 1](docs/content/john-reception.md), [biblioteca teológica](docs/content/theological-library.md) e [cobertura de conteúdo](docs/content/content-coverage.md).

Consulte [docs/corpora/README.md](docs/corpora/README.md) para aquisição e geração, [docs/corpora/phase10-content.md](docs/corpora/phase10-content.md) para a expansão de conteúdo, [docs/architecture/text-identity.md](docs/architecture/text-identity.md) para a base arquitetural da Fase 8, [docs/architecture/phase9-5-consolidation.md](docs/architecture/phase9-5-consolidation.md) para o runtime canônico e [docs/architecture/private-document-ingestion.md](docs/architecture/private-document-ingestion.md) para a ingestão local de PDFs privados.

## Limites atuais

O Content Seed v0.1 e o pacote Phase 10 v0.2 incluem uma vertical source-backed de João 1:1–18, bibliografia real do problema sinótico, TBESG completo e o WLC/OSHB 2.2 completo. Conteúdo machine-assisted permanece rotulado como rascunho, e documentos históricos sem edição digital redistribuível verificada continuam metadata-only. PDFs privados com camada textual podem ser indexados localmente e não integram os pacotes redistribuíveis. Nag Hammadi possui catálogo integral, mas somente o Evangelho de Tomé copta está instalado. O projeto ainda não inclui Septuaginta, aparato crítico, tradução portuguesa licenciada de Nag Hammadi, IA/RAG, EPUB/OCR ou alinhamento português↔grego/hebraico.
