# Academic library

The Library page reads the mutable workspace SQLite database through `LibraryRepository`. It lists and searches sources, filters by collection, opens Work/Edition/Author metadata, shows rights and identifiers, creates structured citations, and traces citation-linked claims.

Collections and personal tags are separate from theological topics. Collections are user-created and sources can be added without changing ontology. The repository boundary already supports filters by author, language, source type, citations and local files; period/tradition/read-state are future query extensions.

CSL-JSON, the explicitly labelled basic BibTeX subset, and RIS follow `parse -> normalize -> validate -> duplicate preview -> import -> report`. DOI/ISBN are normalized but original values are retained. Duplicate detection prioritizes DOI/ISBN, then title+author+year. Conflicting records are skipped and reported; automatic destructive merge is intentionally absent.
