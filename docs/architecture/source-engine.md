# Source engine

The source domain separates an intellectual `Work`, a concrete `Edition`, a catalogued `BibliographicSource`, and structured `Author` records. Sources can form parent/child relationships, carry extensible identifiers, preserve import provenance, and describe metadata/content redistribution independently.

Authors support people, organizations, collectives, anonymous works and traditional attributions. Historical dates use the Phase 8 temporal model rather than JavaScript `Date`. Authorship attribution remains relational so disputed authorship can later become sourced claims instead of a boolean property.

`LocalAsset` associates a file with a source without making the file the source. `SourceTextExtractor` safely supports UTF-8 TXT/Markdown up to 10 MiB, while the private-document pipeline supports PDFs with a text layer in the browser workspace. EPUB and OCR remain future adapters. Replacing an asset must create a new checksum/provenance record rather than silently rewriting history.

The Source Engine catalogs evidence; it never elevates a source to truth. Claims and arguments state whether a citation supports, challenges, qualifies or contextualizes them.
