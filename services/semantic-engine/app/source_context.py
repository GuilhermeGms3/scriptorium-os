"""Calibrated patristic/confessional source contexts; no inferred verse destinations.

The canonical TS parser supplies references. A homily's explicit opening citation
is its primary pericope; a confession CITES, it does not explain every proof text.
Book-wide expositions remain book-wide. No SQLite or LLM in this module.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.commentary_extractor import SCHEME, Book, Extraction, Piece, Snapshot, batch_id
from app.commentary_structured import Layout, utf16_to_index

VERSION = "source-context-v1"


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    checksum: str = Field(pattern=r"^[a-f0-9]{64}$")
    kind: Literal["patristic-exposition", "catechism", "confession"]
    strategy: Literal["john-conferences", "book-exposition", "numbered-paragraphs", "articles"]
    firstPage: int = Field(gt=0)
    lastPage: int = Field(gt=0)
    headingPattern: str
    expectedSections: int | None = Field(default=None, gt=0)
    bodyHeight: float
    extraHeights: list[float] = Field(default_factory=list)
    minY: float = 45
    maxY: float = 900
    bookId: str | None = None
    authorLabel: str
    traditionLabel: str | None = None


class Reference(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rawReference: str
    startOffset: int
    endOffset: int
    bookId: str
    chapter: int
    verseStart: int | None = None
    verseEnd: int | None = None
    zone: str | None = None
    footnoteLabel: str | None = None


class ReferencePage(BaseModel):
    physicalPage: int
    references: list[Reference]
    footnotes: list[Reference] = Field(default_factory=list)


class ReferenceIndex(BaseModel):
    sourceChecksum: str
    snapshotChecksum: str
    pages: list[ReferencePage]


@dataclass
class Section:
    locator: str
    pieces: list[Piece]
    start_page: int
    end_page: int
    path: list[str] = field(default_factory=list)


def source_pieces(snapshot: Snapshot, geometry: Layout, profile: Profile) -> list[Piece]:
    if geometry.sourceChecksum != snapshot.checksum:
        raise ValueError("Layout/source checksum mismatch")
    indexed = {page.physicalPage: page for page in geometry.pages}
    result: list[Piece] = []
    for page in snapshot.pages:
        if not profile.firstPage <= page.physicalPage <= profile.lastPage:
            continue
        layout = indexed[page.physicalPage]
        if (
            layout.unmatched
            or hashlib.sha256(page.text.encode()).hexdigest() != layout.textChecksum
        ):
            raise ValueError("Unaligned source page; publication refused")
        # Include superscript citation markers on a body line, never the smaller
        # editorial footnotes. They remain in the literal evidence and in Rastro.
        body_y = [
            span.y
            for span in layout.spans
            if abs(span.height - profile.bodyHeight) < 0.15 and profile.minY < span.y < profile.maxY
        ]
        for span in layout.spans:
            permitted = any(
                abs(span.height - height) < 0.15
                for height in [profile.bodyHeight, *profile.extraHeights]
            ) or (span.height < profile.bodyHeight and any(abs(span.y - y) < 6 for y in body_y))
            if not permitted or not profile.minY < span.y < profile.maxY:
                continue
            start = utf16_to_index(page.text, span.startOffset)
            end = utf16_to_index(page.text, span.endOffset)
            if (
                profile.strategy == "book-exposition"
                and abs(span.height - 10.5) < 0.15
                and not re.fullmatch(r"CAPÍTULO [IVXLCDM]+", page.text[start:end])
                and not any(abs(span.y - y) < 6 for y in body_y)
            ):
                continue
            if (
                result
                and result[-1].page == page.physicalPage
                and not page.text[result[-1].end : start].strip()
            ):
                result[-1].end = end
                result[-1].text = page.text[result[-1].start : end]
            else:
                result.append(Piece(page.physicalPage, start, end, page.text[start:end]))
    return result


def sections(pieces: list[Piece], pattern: str, numbered: bool = False) -> list[Section]:
    result: list[Section] = []
    current: Section | None = None
    last_number = 0
    parent: list[str] = []
    for piece in pieces:
        matches = list(re.finditer(pattern, piece.text, re.M))
        position = 0
        for match in matches:
            if numbered:
                number = int(match.group().strip().rstrip("."))
                if number <= last_number:
                    continue  # A numbered list INSIDE a paragraph is not a new CIC paragraph.
                last_number = number
            if current and match.start() > position:
                current.pieces.append(
                    Piece(
                        piece.page,
                        piece.start + position,
                        piece.start + match.start(),
                        piece.text[position : match.start()],
                    )
                )
                current.end_page = piece.page
            label = match.group().strip()
            if label.startswith("COMENTÁRIO"):
                parent = [label]
            elif label.startswith("LIVRO"):
                parent = [part for part in parent if not part.startswith("LIVRO")] + [label]
            current = Section(
                label,
                [],
                piece.page,
                piece.page,
                [*parent, label] if label not in parent else parent.copy(),
            )
            result.append(current)
            position = match.start()
        if current and position < len(piece.text):
            current.pieces.append(
                Piece(piece.page, piece.start + position, piece.end, piece.text[position:])
            )
            current.end_page = piece.page
    return result


def valid_target(ref: Reference, books: dict[str, Book]) -> dict[str, object] | None:
    # Historic Psalter numbering needs an explicit crosswalk. Do not assume it.
    if ref.zone or ref.bookId == "psalms" or ref.bookId not in books:
        return None
    limits = {entry.chapter: entry.lastVerse for entry in books[ref.bookId].verseLimits}
    if ref.chapter not in limits:
        return None
    if (
        ref.verseStart is not None
        and not 1 <= ref.verseStart <= (ref.verseEnd or ref.verseStart) <= limits[ref.chapter]
    ):
        return None
    return {
        "bookId": ref.bookId,
        "workId": f"work:{ref.bookId}",
        "chapter": ref.chapter,
        "versificationSchemeId": SCHEME,
        **(
            {"verseStart": ref.verseStart, "verseEnd": ref.verseEnd or ref.verseStart}
            if ref.verseStart is not None
            else {}
        ),
    }


def refs_in(section: Section, index: ReferenceIndex, snapshot: Snapshot) -> list[Reference]:
    pages = {p.physicalPage: p.text for p in snapshot.pages}
    references = {p.physicalPage: p.references for p in index.pages}
    result: list[Reference] = []
    for piece in section.pieces:
        for ref in references.get(piece.page, []):
            start = utf16_to_index(pages[piece.page], ref.startOffset)
            end = utf16_to_index(pages[piece.page], ref.endOffset)
            if piece.start <= start and end <= piece.end:
                result.append(ref)
    return result


def chunks(pieces: list[Piece]) -> list[list[Piece]]:
    """Bounded exact geometry runs/pages, never a synthetic summary or rewritten sentence."""
    result: list[list[Piece]] = []
    current: list[Piece] = []
    size = 0
    for piece in pieces:
        if current and (size + len(piece.text) > 8500 or len(current) >= 5):
            result.append(current)
            current = []
            size = 0
        if len(piece.text) > 8500:
            # Unexpected giant page: keep as an exception in extraction, never truncate.
            result.append([piece])
            continue
        current.append(piece)
        size += len(piece.text)
    if current:
        result.append(current)
    return result


def extract(
    snapshot: Snapshot,
    geometry: Layout,
    index: ReferenceIndex,
    profile: Profile,
    snapshot_checksum: str,
) -> Extraction:
    if (
        snapshot.checksum != profile.checksum
        or index.sourceChecksum != snapshot.checksum
        or index.snapshotChecksum != snapshot_checksum
    ):
        raise ValueError("Profile/reference index does not match source snapshot")
    result = Extraction(version=VERSION)
    pieces = source_pieces(snapshot, geometry, profile)
    groups = sections(pieces, profile.headingPattern, profile.strategy == "numbered-paragraphs")
    if profile.expectedSections is not None and len(groups) != profile.expectedSections:
        raise ValueError(f"Expected {profile.expectedSections} source sections, got {len(groups)}")
    books = {book.id: book for book in snapshot.books}
    pages = {page.physicalPage: page.text for page in snapshot.pages}
    result.processed_pages = profile.lastPage - profile.firstPage + 1
    for group in groups:
        targets: list[dict[str, object]] = []
        if profile.strategy == "john-conferences":
            # Primary citation is the footnote attached to the opening biblical
            # lemma, BEFORE the translator's Análise. Not the homily's first cross-reference.
            opening = " ".join(
                piece.text for piece in group.pieces if piece.page <= group.start_page + 4
            )
            before = opening.split("Análise", 1)[0]
            marker = re.search(r"(\d+)\s*\.?\s*$", before)
            footnotes: list[Reference] = []
            if marker and "Análise" in opening:
                n = marker[1]
                for page in index.pages:
                    if group.start_page <= page.physicalPage <= group.start_page + 4:
                        for ref in page.footnotes:
                            if ref.bookId == "john" and ref.footnoteLabel == n:
                                footnotes.append(ref)
            resolved = [valid_target(ref, books) for ref in footnotes]
            targets = [target for target in resolved if target is not None]
            if len(targets) != 1:
                result.exceptions.append(
                    {"locator": group.locator, "reason": "unresolved-primary-homily-citation"}
                )
                continue
            # Drop opening lemma and translator analysis; retain only Augustine's exposition.
            body_found = False
            body: list[Piece] = []
            for piece in group.pieces:
                match = re.search(r"(?m)^01(?:\s*[–—-].*)?$", piece.text)
                if not body_found and match:
                    body_found = True
                    body.append(
                        Piece(
                            piece.page,
                            piece.start + match.start(),
                            piece.end,
                            piece.text[match.start() :],
                        )
                    )
                elif body_found:
                    body.append(piece)
            if not body_found:
                result.exceptions.append(
                    {"locator": group.locator, "reason": "homily-body-not-found"}
                )
                continue
            group.pieces = body
        elif profile.strategy == "book-exposition":
            if profile.bookId not in books:
                raise ValueError("Explicit work-level biblical target required")
            targets = [
                {
                    "bookId": profile.bookId,
                    "workId": f"work:{profile.bookId}",
                    "versificationSchemeId": SCHEME,
                }
            ]
        else:
            for ref in refs_in(group, index, snapshot):
                target = valid_target(ref, books)
                if target and target not in targets:
                    targets.append(target)
                elif target is None:
                    result.exceptions.append(
                        {
                            "locator": group.locator,
                            "reference": ref.rawReference,
                            "reason": "reference-needs-scheme-or-address-review",
                        }
                    )
        result.sections.append(
            {
                "locator": group.locator,
                "firstPage": group.start_page,
                "lastPage": group.end_page,
                "targets": targets,
            }
        )
        if not targets:
            result.exceptions.append(
                {"locator": group.locator, "reason": "no-explicit-biblical-target"}
            )
            continue
        for part in chunks(group.pieces):
            summary = " ".join(piece.text.strip() for piece in part)
            if not 20 <= len(summary) <= 12000 or any(
                len(p.text.strip()) < 20 or pages[p.page].count(p.text.strip()) != 1 for p in part
            ):
                result.exceptions.append(
                    {"locator": group.locator, "reason": "fragment-size-or-uniqueness"}
                )
                continue
            protected = any(
                s.physicalPage == p.page
                and s.startOffset < len(pages[p.page][: p.end].encode("utf-16-le")) // 2
                and s.endOffset > len(pages[p.page][: p.start].encode("utf-16-le")) // 2
                for p in part
                for s in snapshot.protectedSpans
            )
            if protected:
                result.protected += 1
                continue
            for target in targets:
                scope = (
                    "book"
                    if "chapter" not in target
                    else "chapter"
                    if "verseStart" not in target
                    else "verse"
                    if target["verseStart"] == target["verseEnd"]
                    else "range"
                )
                confession = profile.kind != "patristic-exposition"
                rationale = (
                    "Citação bíblica explícita no parágrafo/artigo confessional; "
                    "vínculo de texto-prova, não comentário exegético universal."
                    if confession
                    else "Passagem principal explícita da conferência; trecho de exposição "
                    "patrística, sem distribuir remissões secundárias."
                    if profile.strategy == "john-conferences"
                    else "Contexto da obra expositiva como um todo; numeração interna "
                    "não é capítulo/versículo bíblico."
                )
                result.notes.append(
                    {
                        "sourceChecksum": snapshot.checksum,
                        "fragments": [
                            {"physicalPage": p.page, "quote": p.text.strip()} for p in part
                        ],
                        "rawReference": group.locator[:200],
                        "passage": target,
                        "additionalPassages": [],
                        "relationScope": scope,
                        "relationType": "cites" if confession else "discusses",
                        **({"referenceRole": "proof-text"} if confession else {}),
                        "domains": ["theology", "tradition"]
                        if confession
                        else ["patristics", "exegesis"],
                        "analysis": {
                            "title": f"{snapshot.title} · {group.locator}"[:200],
                            "summary": summary,
                            "mode": "source-excerpt",
                            "rationale": rationale,
                            "contentType": "theological-interpretation"
                            if confession
                            else "source-commentary",
                            "sourceContext": {
                                "kind": profile.kind,
                                "locator": group.locator[:300],
                                "sectionPath": [part[:300] for part in group.path[-8:]],
                                "authorLabel": profile.authorLabel,
                                **(
                                    {"traditionLabel": profile.traditionLabel}
                                    if profile.traditionLabel
                                    else {}
                                ),
                            },
                            "limitations": [
                                "Trecho original; ligação determinística, com auditoria pendente, "
                                "não revisão humana individual.",
                                rationale,
                            ],
                        },
                    }
                )
    return result


def publish_staging(result: Extraction, snapshot: Snapshot, output: Path) -> None:
    """Same private batch contract consumed by the canonical TS importer."""
    import json
    from datetime import UTC, datetime

    output.mkdir(parents=True, exist_ok=False)
    files: list[dict[str, object]] = []
    for start in range(0, len(result.notes), 100):
        notes = result.notes[start : start + 100]
        identifier = batch_id(snapshot.checksum, notes, VERSION)
        raw = json.dumps(
            {
                "format": "scriptorium-contextual-reading-v1",
                "batchId": identifier,
                "analyst": f"deterministic-{VERSION}",
                "createdAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
                "coverage": "Contextos patrísticos/confessionais explícitos; notas originais, "
                "sem inferência LLM; exceções no relatório privado.",
                "notes": notes,
            },
            ensure_ascii=False,
            indent=2,
        ).encode()
        filename = f"{start // 100:04d}-{identifier}.json"
        (output / filename).write_bytes(raw)
        files.append({"file": filename, "sha256": hashlib.sha256(raw).hexdigest()})
    report = {
        "format": "scriptorium-commentary-report-v1",
        "sourceChecksum": snapshot.checksum,
        "structureResolved": True,
        "sourceType": "source-context",
        "version": VERSION,
        "processedPages": result.processed_pages,
        "extractedNotes": len(result.notes),
        "sections": result.sections,
        "exceptions": result.exceptions,
        "files": files,
        "publication": "staging-only",
    }
    (output / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "notes": len(result.notes),
                "sections": len(result.sections),
                "exceptions": len(result.exceptions),
            }
        )
    )


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["snapshot", "layout", "references", "profile", "output"]:
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    raw = args.snapshot.read_bytes()
    snapshot = Snapshot.model_validate_json(raw)
    result = extract(
        snapshot,
        Layout.model_validate_json(args.layout.read_bytes()),
        ReferenceIndex.model_validate_json(args.references.read_bytes()),
        Profile.model_validate_json(args.profile.read_bytes()),
        hashlib.sha256(raw).hexdigest(),
    )
    publish_staging(result, snapshot, args.output)


if __name__ == "__main__":
    main()
