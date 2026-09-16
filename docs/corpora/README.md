# Corpus Registry

Esta pasta é a camada humana do registro definido em
`src/lib/fixtures/corpus-registry.fixture.ts`. Um registro aqui não significa que o corpus foi
baixado, validado ou incluído no produto.

Fluxo obrigatório:

`Corpus -> Edition -> CorpusPackage -> SourceArtifact -> Provenance -> RightsDeclaration -> Transformation -> ImportedData`

Somente um pacote com direitos `verified` e redistribuição explicitamente permitida pode passar
pelo `CorpusRightsGate`. `Verified` significa apenas que a metadata foi conferida contra a fonte
registrada; não é parecer jurídico. O arquivo original deve receber SHA-256 antes da importação e
nunca pode ser substituído por um derivado normalizado.

## Candidatos

- [Pipeline universal de ingestão](./ingestion-pipeline.md)
- [SBLGNT](./sblgnt.md)
- [Open Scriptures Hebrew Bible](./oshb.md)
- [STEPBible Data](./stepbible-data.md)
- [STEPBible TAGNT — camada real, direitos e relatório da Fase 5](./stepbible-tagnt.md)
- [Algoritmo e contratos de alinhamento](./linguistic-alignment.md)
- [Bíblia Livre N4 — corpus oficial importado e relatório da Fase 6](./biblia-livre.md)
