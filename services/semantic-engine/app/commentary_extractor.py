"""Deterministic extraction for calibrated, notes-only study-Bible PDFs.

Consumes a read-only workspace snapshot; never opens or writes its SQLite database.
Unknown layouts are refused. Existing editorial spans are protected; ambiguous notes
are reported, not silently repaired or assigned to cross-references in their prose.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

VERSION = "notes-only-v1"
SCHEME = "scriptorium-bcv-1"
MARKER = re.compile(
    r"(?m)^(?:[•*]\s*N\.\s*Hom\.\s*)?"
    r"(?P<chapter>\d{1,3})\s*[.:]\s*(?P<verse>\d{1,3})"
    r"(?P<tail>(?:\s*[-–]\s*\d{1,3}(?:\s*[.:]\s*\d{1,3})?|"
    r"\s*[,.]\s*\d{1,3})*)[ \t]+(?=\S)"
)
SINGLE_MARKER = re.compile(r"(?m)^(?P<verse>\d{1,2})[ \t]+(?=[A-ZÁÀÉÍÓÚÔÊ])")
SINGLE_BOLD_MARKER = re.compile(
    r"(?m)^(?P<verse>\d{1,2})(?P<tail>(?:\s*[-–,]\s*\d{1,2})*)[ \t]+(?=\S)"
)
CHAPTER_MARKER = re.compile(r"(?mi)^cap(?:[íi]tulo)?\.?[ \t]+(?P<chapter>\d{1,3})[ \t]+(?=\S)")


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Page(Contract):
    physicalPage: int = Field(gt=0)
    text: str


class Span(Contract):
    physicalPage: int = Field(gt=0)
    startOffset: int = Field(ge=0)
    endOffset: int = Field(gt=0)


class ChapterLimit(Contract):
    chapter: int = Field(gt=0)
    lastVerse: int = Field(gt=0)


class Book(Contract):
    id: str
    aliases: list[str]
    verseLimits: list[ChapterLimit]


class Snapshot(Contract):
    format: str
    checksum: str = Field(pattern=r"^[a-f0-9]{64}$")
    title: str
    pages: list[Page]
    protectedSpans: list[Span]
    books: list[Book]


class Profile(Contract):
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    checksum: str = Field(pattern=r"^[a-f0-9]{64}$")
    layout: str
    firstPage: int = Field(gt=0)
    markerStyle: Literal["calibrated-line", "bold-font"] = "calibrated-line"
    # Operator-calibrated headings override damaged/machine-translated book titles.
    headingAliases: dict[str, list[str]] = Field(default_factory=dict)


def normalize(text: str) -> str:
    return " ".join(
        "".join(
            c
            for c in unicodedata.normalize("NFD", text.casefold())
            if unicodedata.category(c) != "Mn"
        ).split()
    )


def is_heading(line: str, book: Book, profile: Profile) -> bool:
    text = re.sub(r"\s+autor$", "", normalize(line))
    aliases = [normalize(x) for x in [*book.aliases, *profile.headingAliases.get(book.id, [])]]
    if text in aliases:
        return True
    if len(text) > 95 or re.search(r"[.,;:!?()]", text):
        return False
    if not re.match(
        r"^(?:(?:o|a|os|as) )?(?:primeir[oa]|segund[oa]|terceir[oa]|"
        r"quarto|quinto|livro|epistola|evangelho|carta|cantico|atos|"
        r"lamentacoes|proverbios|apocalipse)\b",
        text,
    ):
        return False
    number = re.match(r"([123])-", book.id)
    if number:
        ordinal = {"1": "primeir", "2": "segund", "3": "terceir"}[number[1]]
        if not re.search(rf"\b{ordinal}[oa]\b", text):
            return False
        aliases = [re.sub(r"^[123]\s+", "", x) for x in aliases]
    return any(re.search(rf"\b{re.escape(alias)}\b", text) for alias in aliases)


@dataclass
class Piece:
    page: int
    start: int
    end: int
    text: str


@dataclass
class Pending:
    book: Book
    chapter: int
    verse: int
    end_verse: int
    raw: str
    homiletic: bool
    reason: str | None = None
    end_chapter: int | None = None
    pieces: list[Piece] = field(default_factory=list)


@dataclass
class Extraction:
    notes: list[dict[str, object]] = field(default_factory=list)
    exceptions: list[dict[str, object]] = field(default_factory=list)
    sections: list[dict[str, object]] = field(default_factory=list)
    protected: int = 0
    ignored_pages: int = 0
    processed_pages: int = 0


def extract(
    snapshot: Snapshot, profile: Profile, bold_prefixes: dict[int, list[str]] | None = None
) -> Extraction:
    if snapshot.format != "scriptorium-commentary-source-v1":
        raise ValueError("Unsupported snapshot")
    if profile.layout != "notes-only" or profile.checksum != snapshot.checksum:
        raise ValueError("Layout/source not calibrated; refusing generic PDF inference")
    if profile.markerStyle == "bold-font" and bold_prefixes is None:
        raise ValueError("This profile requires PDF font/layout evidence")
    if len({p.physicalPage for p in snapshot.pages}) != len(snapshot.pages):
        raise ValueError("Duplicate physical page")
    result = Extraction()
    current: Book | None = None
    next_book = 0
    active = False
    pending: Pending | None = None
    last_chapter = 0
    protected: dict[int, list[Span]] = {}
    page_texts = {p.physicalPage: p.text for p in snapshot.pages}
    for span in snapshot.protectedSpans:
        protected.setdefault(span.physicalPage, []).append(span)

    def flush() -> None:
        nonlocal pending
        if not pending:
            return
        note = pending
        pending = None
        text = " ".join(p.text.strip() for p in note.pieces).strip()
        reason = note.reason
        if not reason and (
            len(text) < 20
            or len(text) > 12000
            or len(note.pieces) > 5
            or any(len(p.text.strip()) < 20 for p in note.pieces)
        ):
            reason = "note-size-or-fragment-limit"
        if not reason and re.fullmatch(
            r"[\d\s.,:;–-]*(?:veja|ver|cf\.?|vide|see)\b.*", normalize(text)
        ):
            reason = "reference-only-not-commentary"
        pointer = re.search(r"\b(?:veja|ver|vide|see|consulte)\b", normalize(text))
        if (
            not reason
            and pointer
            and pointer.start() < 80
            and len(normalize(text)[pointer.start() :]) < 100
        ):
            reason = "reference-only-not-commentary"
        if not reason and not re.search(r"[.!?;:]\s*$", text):
            reason = "possibly-incomplete-note"
        if reason:
            result.exceptions.append(
                {
                    "bookId": note.book.id,
                    "rawReference": note.raw,
                    "page": note.pieces[0].page if note.pieces else None,
                    "reason": reason,
                }
            )
            return
        if any(
            s.startOffset < len(page_texts[p.page][: p.end].encode("utf-16-le")) // 2
            and s.endOffset > len(page_texts[p.page][: p.start].encode("utf-16-le")) // 2
            for p in note.pieces
            for s in protected.get(p.page, [])
        ):
            result.protected += 1
            return
        passage: dict[str, object] = {
            "bookId": note.book.id,
            "workId": f"work:{note.book.id}",
            "chapter": note.chapter,
            "verseStart": note.verse,
            "verseEnd": note.end_verse,
            "versificationSchemeId": SCHEME,
        }
        scope = "verse" if note.verse == note.end_verse else "range"
        additional: list[dict[str, object]] = []
        if note.verse == 0:
            passage.pop("verseStart")
            passage.pop("verseEnd")
            scope = "chapter"
        elif note.end_chapter:
            scope = "pericope"
            limits = {x.chapter: x.lastVerse for x in note.book.verseLimits}
            passage["verseEnd"] = limits[note.chapter]
            for chapter in range(note.chapter + 1, note.end_chapter + 1):
                additional.append(
                    {
                        **passage,
                        "chapter": chapter,
                        "verseStart": 1,
                        "verseEnd": note.end_verse
                        if chapter == note.end_chapter
                        else limits[chapter],
                    }
                )
        rationale = (
            f"Marcador principal {note.raw} sob o cabeçalho de {note.book.id}; "
            "perfil notes-only calibrado. Referências no corpo não substituem o destino principal. "
            "Extração determinística do original, não síntese nem revisão da interpretação."
        )
        result.notes.append(
            {
                "sourceChecksum": snapshot.checksum,
                "fragments": [
                    {"physicalPage": p.page, "quote": p.text.strip()}
                    for p in note.pieces
                    if p.text.strip()
                ],
                "rawReference": note.raw,
                "passage": passage,
                "additionalPassages": additional,
                "relationScope": scope,
                "domains": ["exegesis"],
                "analysis": {
                    "title": f"{snapshot.title} · {note.book.aliases[0]} {note.raw}"[:200],
                    "summary": text,
                    "mode": "source-excerpt",
                    "rationale": rationale,
                    "contentType": "homiletical-application"
                    if note.homiletic
                    else "source-commentary",
                    "limitations": [
                        "Texto e interpretação atribuídos à fonte; ligação automática, "
                        "sem revisão humana individual. "
                        "O original pode conter erros editoriais/OCR."
                    ],
                },
            }
        )

    def add_piece(page: Page, start: int, end: int) -> None:
        if pending and page.text[start:end].strip():
            pending.pieces.append(Piece(page.physicalPage, start, end, page.text[start:end]))

    for page in sorted(snapshot.pages, key=lambda p: p.physicalPage):
        result.processed_pages += 1
        if page.physicalPage < profile.firstPage:
            result.ignored_pages += 1
            continue
        # Python codepoints here; the canonical importer resolves quotes to UTF-16 offsets.
        boundaries: list[tuple[int, int, Book]] = []
        for line in re.finditer(r"(?m)^.*$", page.text):
            if next_book < len(snapshot.books) and is_heading(
                line[0], snapshot.books[next_book], profile
            ):
                detected_book = snapshot.books[next_book]
                boundaries.append((line.start(), line.end(), detected_book))
                next_book += 1
        cursor = 0
        events: list[tuple[int, int, Book | None]] = [
            *boundaries,
            (len(page.text), len(page.text), None),
        ]
        for start, end, book in events:
            segment = page.text[cursor:start]
            interruption = (
                re.search(
                    r"(?m)^(?:INTRODUÇÃO A[OÀS]?|O NOVO TESTAMENTO|O ANTIGO TESTAMENTO)\b",
                    segment,
                )
                if active
                else None
            )
            if interruption:
                segment = segment[: interruption.start()]
            if current:
                # Single-chapter letters have bare verse markers in some notes-only editions.
                matches = sorted(
                    [*MARKER.finditer(segment), *CHAPTER_MARKER.finditer(segment)],
                    key=lambda m: m.start(),
                )
                if len(current.verseLimits) == 1:
                    matches = sorted(
                        [
                            *matches,
                            *(
                                SINGLE_BOLD_MARKER
                                if profile.markerStyle == "bold-font"
                                else SINGLE_MARKER
                            ).finditer(segment),
                        ],
                        key=lambda m: m.start(),
                    )
                tail = cursor
                for marker_index, marker in enumerate(matches):
                    if profile.markerStyle == "bold-font":
                        rest = re.sub(r"\s", "", segment[marker.start() :])
                        if not any(
                            (
                                bool(re.match(re.escape(prefix) + r"(?!\d)", rest))
                                and "chapter" not in marker.re.groupindex
                            )
                            if prefix.isdigit()
                            else rest.startswith(prefix)
                            for prefix in (bold_prefixes or {}).get(page.physicalPage, [])
                        ):
                            continue
                    if profile.markerStyle == "calibrated-line":
                        body_start = segment[marker.end() :].lstrip()
                        # A wrapped citation such as "8.32 e 1 Co 11.23)" is not a new note.
                        if re.match(r"^(?:e|ou)\s+(?:\d|[A-Z][a-z]{0,3}\b)", body_start):
                            continue
                        candidate_chapter = (
                            int(marker["chapter"]) if "chapter" in marker.re.groupindex else 1
                        )
                        next_marker = (
                            matches[marker_index + 1] if marker_index + 1 < len(matches) else None
                        )
                        if (
                            active
                            and candidate_chapter > last_chapter + 1
                            and next_marker
                            and "chapter" in next_marker.re.groupindex
                            and int(next_marker["chapter"]) < candidate_chapter
                        ):
                            # Keep evidence in its real note; never auto-repair an address.
                            continue
                    at = cursor + marker.start()
                    if active:
                        add_piece(page, tail, at)
                        flush()
                    chapter = int(marker["chapter"]) if "chapter" in marker.re.groupindex else 1
                    verse = int(marker["verse"]) if "verse" in marker.re.groupindex else 0
                    raw_tail = marker["tail"] if "tail" in marker.re.groupindex else ""
                    raw = (
                        f"Cap. {chapter}" if verse == 0 else f"{chapter}:{verse}{raw_tail.strip()}"
                    )
                    if not active and chapter != 1:
                        tail = cursor + marker.end()
                        continue
                    active = True
                    limit = next(
                        (x.lastVerse for x in current.verseLimits if x.chapter == chapter), 0
                    )
                    values = re.findall(r"\d+", raw_tail)
                    end_verse = int(values[0]) if values else verse
                    reason = None
                    cross = re.fullmatch(r"\s*[-–]\s*(\d{1,3})\s*[.:]\s*(\d{1,3})", raw_tail)
                    end_chapter = None
                    if cross:
                        end_chapter, end_verse = int(cross[1]), int(cross[2])
                        limits = {x.chapter: x.lastVerse for x in current.verseLimits}
                        if (
                            end_chapter <= chapter
                            or end_chapter - chapter > 100
                            or not all(c in limits for c in range(chapter, end_chapter + 1))
                            or not 1 <= verse <= limit
                            or not 1 <= end_verse <= limits.get(end_chapter, 0)
                        ):
                            reason = "cross-chapter-range-needs-review"
                    elif ":" in raw_tail or "." in raw_tail:
                        reason = "noncontiguous-target-needs-review"
                    elif "," in raw_tail:
                        reason = "noncontiguous-target-needs-review"
                    elif (verse == 0 and limit == 0) or (
                        verse != 0 and not 1 <= verse <= end_verse <= limit
                    ):
                        reason = "invalid-canonical-address"
                    elif chapter < last_chapter:
                        reason = "chapter-regression-needs-review"
                    if reason is None:
                        last_chapter = chapter
                    pending = Pending(
                        current, chapter, verse, end_verse, raw, "Hom" in marker[0], reason
                    )
                    pending.end_chapter = end_chapter
                    tail = at
                if active:
                    add_piece(page, tail, cursor + len(segment))
            if interruption:
                flush()
                current, active = None, False
            if book:
                flush()
                current, active, last_chapter = book, False, 0
                result.sections.append(
                    {
                        "bookId": book.id,
                        "page": page.physicalPage,
                        "heading": page.text[start:end].strip(),
                    }
                )
            cursor = end
    flush()
    if next_book != len(snapshot.books):
        result.exceptions.append(
            {
                "reason": "missing-book-heading",
                "nextBook": snapshot.books[next_book].id,
                "remainingBooks": len(snapshot.books) - next_book,
            }
        )
    return result


def batch_id(checksum: str, notes: list[dict[str, object]]) -> str:
    # Independent from execution date, so reruns retain stable import/audit identity.
    import json

    digest = hashlib.sha256(
        json.dumps(notes, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:16]
    return f"commentary-{checksum[:12]}-{VERSION}-{digest}"
