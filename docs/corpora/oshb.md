# Open Scriptures Hebrew Bible

The candidate is intentionally split because the WLC text and the Open Scriptures linguistic
layer have different origins and rights declarations.

## WLC text

- Identity: corpus `wlc`; edition `wlc-morphhb-candidate`; package
  `pkg-wlc-morphhb-candidate`.
- Source: `https://github.com/openscriptures/morphhb`.
- Version: unresolved until a concrete artifact/revision is selected.
- Rights: the official project notice declares the WLC text public domain; status `verified`.
- Attribution: not required by the recorded public-domain declaration; citation remains
  recommended for provenance.
- Status: candidate only; no artifact or text imported.

## Lemma and morphology layer

- Identity: corpus `oshb-morphology`; edition `oshb-morphology-candidate`; package
  `pkg-oshb-morphology-candidate`.
- Source: same official repository, but tracked as a separate package.
- Rights: CC BY 4.0; status `verified`; attribution to the Open Scriptures Hebrew Bible Project is
  required.
- Capabilities: tokens, lemmas, morphology and Strong-compatible identifiers.
- Status: candidate only; no dataset imported.

Known issues: select exact repository revision/files, record WLC version, verify the concrete OSIS
headers and versification, then calculate SHA-256.

Decision: never collapse WLC text rights into the morphology-layer rights. Evidence consulted on
2026-08-26: `https://github.com/openscriptures/morphhb/blob/master/LICENSE.md`.
