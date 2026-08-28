# STEPBible Data

Atualização Fase 5: a coleção genérica continua candidata. O pacote separado
[`stepbible-tagnt`](./stepbible-tagnt.md) foi selecionado, revisado e importado;
isso não libera os demais subdatasets da coleção.

- Identity: corpus `stepbible-data`; edition `stepbible-data-candidate`; package
  `pkg-stepbible-data-candidate`.
- Source: official repository `https://github.com/STEPBible/STEPBible-Data`.
- Version: no subdataset/revision selected.
- Rights: repository README declares CC BY 4.0 and attribution to STEP Bible, but individual
  dataset notices and upstream sources have not been reviewed.
- Attribution: preserve the repository instruction to credit STEP Bible and link to its project.
- Status: `needs-review`; redistribution and bundling are blocked.
- Known issues: the candidate represents a collection, while provenance, versions, formats and
  capabilities vary by subdataset.
- Decision: the first real package must target one named dataset and register its own notices,
  artifact and checksum; repository-level metadata is not inherited blindly.

Evidence consulted on 2026-08-26:
`https://github.com/STEPBible/STEPBible-Data/blob/master/README.md`.
