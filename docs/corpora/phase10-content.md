# Phase 10 content packages

Phase 10 turns the existing corpus and knowledge architecture into a content-bearing research
runtime. Content status is intentionally explicit:

- `REAL`: imported from a pinned source or bibliographic record with traceable rights metadata.
- `EDITORIAL`: Scriptorium taxonomy or methodological description, never attributed to an
  external scholar.
- `DEMO`: synthetic examples only; none are added by the Phase 10 pack.
- `USER`: private workspace content, stored separately in OPFS.

## Greek lexicon

TBESG is pinned by URL, commit, byte size and SHA-256 in `content/source-lock.json`. Its 11,035
records are parsed into `lexemes`, `lexical_senses` and normalized `lexical_references`. The
Reader resolves a TAGNT Strong reference to the lexicon lazily from the SBLGNT linguistic shard.
Definitions are converted to safe plain text; source markup is not rendered as HTML.

Attribution: STEP Bible data, Tyndale House, Cambridge. License: CC BY 4.0. The upstream
centralization request is preserved operationally by linking to the canonical source and not
presenting the derivative as a new authoritative distribution.

## Hebrew Bible

See [oshb.md](./oshb.md). The full WLC/OSHB release is a distinct corpus package. It is not merged
into the Portuguese translation and no interlinear alignment is invented.

## Knowledge pack

`content/packs/phase10-content-v0.2.json` adds:

- direct textual and linguistic observations across John 1:1–18;
- five clearly machine-assisted, draft analysis records with source links and review labels;
- concept relations for life, light, witness, grace and truth;
- real bibliographic records and work identities for an Apostolic Fathers pilot;
- council-level historical identities kept distinct from creed documents;
- the existing source-backed Synoptic Problem graph remains the canonical pilot debate.

The patristic pilot intentionally keeps the Didache metadata-only because the selected digital
edition's redistribution status is not asserted. Project Gutenberg eBook 77576 provides a verified
public-domain edition record for 1 Clement and other listed Apostolic Fathers; the present pack
indexes metadata and a bounded historical claim, not a silently copied modern translation.

## Remaining content debt

- complete section-addressable primary text for the patristic pilot;
- source fragments with page/section locators for each interpretive analysis;
- a Hebrew dictionary and segmented morpheme model;
- LXX, textual apparatus and Hebrew-Portuguese alignment datasets;
- human academic review of all machine-assisted John analyses.
