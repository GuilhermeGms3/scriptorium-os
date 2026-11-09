# Persistent research workspace

Personal studies, notes, annotations, highlights, bookmarks and research questions live in a mutable SQLite database separate from immutable corpus and curated knowledge packages. In browsers the database is owned by one dedicated Worker and persisted through SQLite's OPFS SAH-pool VFS. When OPFS is unavailable the UI reports degraded in-memory mode instead of pretending persistence.

The startup migration imports legacy studies, their items and notes from localStorage once, then removes those old records. Theme, reading preferences and package enablement remain appropriate small preferences in localStorage.

Research questions aggregate linked sources, passages, claims, arguments, theories and notes. Their provisional conclusions are user-owned and never become shared academic claims automatically. FTS5 indexes source titles, citation text, notes and research questions.

JSON export and validated, idempotent import provide a portable backup. Backup schema v3 includes
private-document identity, page anchors, document structure, semantic units, proposal review state,
local translations, human reviews and translation-job progress. It deliberately replaces protected
page text with empty reimport anchors and sets `privateTextIncluded: false`; importing the legally
held original again rehydrates those same page IDs without deleting spans or review decisions.
Schema v1 and v2 backups remain importable. Workspace data is not sent to a remote service and no
account is required.
