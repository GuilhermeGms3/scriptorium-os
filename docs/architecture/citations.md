# Citations

`Citation` stores source identity, a flexible locator, content kind, original/translated text, translator, provenance and review state. `exact-quote`, `paraphrase`, `summary` and `reference-only` are distinct; validation rejects an exact quotation without original text.

Locators can use pages, volume/issue, chapter/section, paragraph, fragment, saying, folio, recto/verso, column and line ranges. This supports modern books as well as manuscripts and Nag Hammadi-style locations without inventing pages.

`citation_relations` connects citations to claims, arguments, theories or passage anchors with typed relations. The workspace database cannot enforce foreign keys into the separately generated knowledge database, so application services validate those targets before writing. Formatting is a presentation concern. The current `neutral` and `basic` renderers are deliberately not advertised as SBL/CSL-compliant.
