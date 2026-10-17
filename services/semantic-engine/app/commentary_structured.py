"""Calibrated original commentaries using PDF outline or verified font geometry.

No SQLite, LLM, translation or generic interpretation. Geometry only selects exact
spans in the previously imported original; canonical TS services publish them.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path
from typing import cast

from pydantic import Field

from app.commentary_extractor import (
    SCHEME,
    Book,
    Contract,
    Extraction,
    Page,
    Piece,
    Profile,
    Snapshot,
    normalize,
)

VERSION = "structured-commentary-v1"
NT_MARKER = re.compile(r"(?m)^(?P<verse>\d{1,3})\.\s+(?=\S)")
AT_MARKER = re.compile(
    r"(?m)^(?P<chapter>\d(?:[ \t]*\d){0,2})[ \t]*\.[ \t]*"
    r"(?P<verse>\d(?:[ \t]*\d){0,2})"
    r"(?P<tail>(?:[ \t]*[-–—,][ \t]*\d(?:[ \t]*\d){0,2}"
    r"(?:[ \t]*\.[ \t]*\d(?:[ \t]*\d){0,2})?)*)[ \t]*[—–-]\s*(?=[^\d\s])"
)
AT_BOUNDARY = re.compile(
    r"(?m)^\d(?:[ \t]*\d){0,2}[ \t]*\.[ \t]*\d"
    r"[\d \t.,:;'’)/\\–—-]{0,25}[—–-]\s*(?=[^\d\s])"
)


class LayoutSpan(Contract):
    startOffset: int = Field(ge=0)
    endOffset: int = Field(gt=0)
    family: str
    x: float
    y: float
    height: float


class LayoutPage(Contract):
    physicalPage: int
    textChecksum: str
    unmatched: int = Field(ge=0)
    spans: list[LayoutSpan]


class Layout(Contract):
    format: str
    sourceChecksum: str
    pages: list[LayoutPage]


@dataclass
class ChapterSection:
    book: Book
    chapter: int
    start: int
    end: int
    commentary_start: int | None = None
    label_conflict: bool = False


def roman(value: str) -> int:
    if not re.fullmatch(r"[IVXLCDM]+", value):
        raise ValueError("Not a Roman chapter")
    numbers = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    return sum(
        -numbers[c] if i + 1 < len(value) and numbers[c] < numbers[value[i + 1]] else numbers[c]
        for i, c in enumerate(value)
    )


def utf16_to_index(text: str, offset: int) -> int:
    return len(text.encode("utf-16-le")[: offset * 2].decode("utf-16-le"))


def body_pieces(page: Page, geometry: LayoutPage, layout: str) -> list[Piece]:
    if hashlib.sha256(page.text.encode()).hexdigest() != geometry.textChecksum:
        raise ValueError("Page text differs from geometry snapshot")
    if geometry.unmatched:
        return []  # Failed alignment is not permission to reconstruct different text.
    # Preserve an inline foreign-script/alternate-font word on a predominantly serif
    # body line. Font-family filtering must not silently remove part of an argument.
    totals: dict[tuple[int, int], tuple[int, int, bool]] = {}
    if layout == "novo-at-serif":
        for span in geometry.spans:
            if 5 <= span.height <= 12 and 38 < span.y < 590:
                key = (int(span.x >= 220), round(span.y))
                serif, total, anchor = totals.get(key, (0, 0, False))
                length = span.endOffset - span.startOffset
                totals[key] = (
                    serif + (length if span.family == "serif" else 0),
                    total + length,
                    anchor or (span.family == "serif" and 8.25 <= span.height <= 8.75),
                )
    body_lines = {
        key for key, (serif, total, anchor) in totals.items() if anchor and serif >= total * 0.6
    }
    pieces: list[Piece] = []
    for span in geometry.spans:
        permitted = (
            span.family in {"serif", "sans-serif"}
            and 10.8 <= span.height <= 11.2
            and 110 < span.y < 710
            if layout == "wesley-outline"
            else (int(span.x >= 220), round(span.y)) in body_lines
            and 5 <= span.height <= 12
            and 38 < span.y < 590
        )
        if not permitted:
            continue
        start, end = (
            utf16_to_index(page.text, span.startOffset),
            utf16_to_index(page.text, span.endOffset),
        )
        if not 0 <= start < end <= len(page.text):
            raise ValueError("Geometry outside source page")
        if pieces and not page.text[pieces[-1].end : start].strip():
            pieces[-1].end = end
            pieces[-1].text = page.text[pieces[-1].start : end]
        else:
            pieces.append(Piece(page.physicalPage, start, end, page.text[start:end]))
    return pieces


def emit(
    result: Extraction,
    snapshot: Snapshot,
    book: Book,
    chapter: int,
    pieces: list[Piece],
    raw: str,
    rationale: str,
    verse: int | None = None,
    verse_end: int | None = None,
    additional: list[dict[str, object]] | None = None,
) -> None:
    pieces = [piece for piece in pieces if piece.text.strip()]
    text = " ".join(piece.text.strip() for piece in pieces)
    reason: str | None = None
    if (
        not 20 <= len(text) <= 12000
        or len(pieces) > 5
        or any(len(p.text.strip()) < 20 for p in pieces)
    ):
        reason = "note-size-or-fragment-limit"
    pages = {page.physicalPage: page.text for page in snapshot.pages}
    if not reason and any(pages[p.page].count(p.text.strip()) != 1 for p in pieces):
        reason = "nonunique-source-fragment"
    if not reason and verse is not None and not re.search(r"[.!?;:]\s*$", text):
        reason = "possibly-incomplete-note"
    if (
        not reason
        and verse is not None
        and re.fullmatch(r"\d+[.\s]*(?:see|cf\.?|veja|ver)\s+.{0,100}", text, re.I)
    ):
        reason = "reference-only-not-commentary"
    if reason:
        result.exceptions.append(
            {"bookId": book.id, "chapter": chapter, "rawReference": raw, "reason": reason}
        )
        return
    for p in pieces:
        start = len(pages[p.page][: p.start].encode("utf-16-le")) // 2
        end = len(pages[p.page][: p.end].encode("utf-16-le")) // 2
        if any(
            s.physicalPage == p.page and s.startOffset < end and s.endOffset > start
            for s in snapshot.protectedSpans
        ):
            result.protected += 1
            return
    passage: dict[str, object] = {
        "bookId": book.id,
        "workId": f"work:{book.id}",
        "chapter": chapter,
        "versificationSchemeId": SCHEME,
    }
    scope = "chapter"
    if verse is not None:
        passage.update(verseStart=verse, verseEnd=verse_end or verse)
        scope = "pericope" if additional else "verse" if verse_end in (None, verse) else "range"
    result.notes.append(
        {
            "sourceChecksum": snapshot.checksum,
            "fragments": [{"physicalPage": p.page, "quote": p.text.strip()} for p in pieces],
            "rawReference": raw,
            "passage": passage,
            "additionalPassages": additional or [],
            "relationScope": scope,
            "domains": ["exegesis"],
            "analysis": {
                "title": f"{snapshot.title} · {book.aliases[0]} {raw}"[:200],
                "summary": text,
                "mode": "source-excerpt",
                "rationale": rationale,
                "contentType": "source-commentary",
                "limitations": [
                    "Comentário original da fonte; associação determinística calibrada, "
                    "sem revisão humana individual.",
                    "Trecho de capítulo não é comentário individual de todos os versículos."
                    if verse is None
                    else "Remissões no corpo são secundárias, não novos destinos principais.",
                ],
            },
        }
    )


def _book_for_title(title: str, books: list[Book]) -> Book:
    normalized = normalize(title)
    if "lamentations" in normalized:
        return next(book for book in books if book.id == "lamentations")
    if "song of solomon" in normalized:
        return next(book for book in books if book.id == "song-of-songs")
    if "revelation" in normalized:
        return next(book for book in books if book.id == "revelation")

    def alias_matches(alias: str) -> bool:
        name = normalize(re.sub(r"^\d\s+", "", alias))
        return bool(re.search(rf"\b{re.escape(name)}\b", normalized))

    candidates = [book for book in books if any(alias_matches(alias) for alias in book.aliases)]
    ordinal = next(
        (
            str(i)
            for i, word in enumerate(["first", "second", "third"], 1)
            if word in normalized.split()
        ),
        None,
    )
    numbered = [book for book in candidates if re.match(r"[123]-", book.id)]
    if numbered and ordinal:
        candidates = [book for book in numbered if book.id.startswith(f"{ordinal}-")]
    elif numbered:
        candidates = [book for book in candidates if not re.match(r"[123]-", book.id)]
    if len(candidates) != 1:
        raise ValueError(f"Unresolved book outline: {title}")
    return candidates[0]


def outline_sections(
    pdf: Path, books: list[Book]
) -> tuple[list[ChapterSection], list[dict[str, object]]]:
    from pypdf import PdfReader
    from pypdf.generic import Destination

    reader = PdfReader(pdf)
    flat: list[tuple[int, str, int]] = []

    def visit(items: list[object], depth: int = 0) -> None:
        for item in items:
            if isinstance(item, list):
                visit(item, depth + 1)
            elif isinstance(item, Destination):
                page = reader.get_destination_page_number(item)
                if page is not None and item.title is not None:
                    flat.append((depth, item.title, page + 1))

    visit(cast(list[object], reader.outline))
    return sections_from_outline(flat, books, len(reader.pages))


def sections_from_outline(
    flat: list[tuple[int, str, int]], books: list[Book], page_count: int
) -> tuple[list[ChapterSection], list[dict[str, object]]]:
    sections: list[ChapterSection] = []
    headings: list[dict[str, object]] = []
    current: Book | None = None
    for depth, title, page in flat:
        if depth == 0:
            if sections and sections[-1].end == page_count:
                sections[-1].end = page - 1
            current = None
        elif depth == 1 and title.startswith("NOTES ON "):
            if sections and sections[-1].end == page_count:
                sections[-1].end = page - 1
            current = _book_for_title(title, books)
            headings.append({"bookId": current.id, "page": page, "heading": title})
        elif current and depth == 2 and re.fullmatch(r"[IVXLCDM]+|\d+", title):
            if sections and sections[-1].end == page_count:
                sections[-1].end = page - 1
            chapter = int(title) if title.isdigit() else roman(title)
            sections.append(ChapterSection(current, chapter, page, page_count))
        elif (
            current
            and depth == 2
            and title.startswith("Commentary on ")
            and len(current.verseLimits) == 1
        ):
            if sections and sections[-1].end == page_count:
                sections[-1].end = page - 1
            sections.append(ChapterSection(current, 1, page, page_count, page))
        elif current and depth == 3 and title.casefold().startswith("commentary ") and sections:
            section = sections[-1]
            section.commentary_start = page
            label = re.search(r"(?:chapter\s+)([IVXLCDM]+|\d+)$", title, re.I)
            if label:
                number = int(label[1]) if label[1].isdigit() else roman(label[1].upper())
                section.label_conflict = number != section.chapter
    if {str(h["bookId"]) for h in headings} != {book.id for book in books} or len(headings) != len(
        books
    ):
        raise ValueError("Missing or duplicate source book outlines")
    return sections, headings


def extract_wesley(
    snapshot: Snapshot, profile: Profile, geometry: dict[int, LayoutPage], pdf: Path
) -> Extraction:
    sections, headings = outline_sections(pdf, snapshot.books)
    result = Extraction(sections=headings, processed_pages=len(snapshot.pages), version=VERSION)
    pages = {page.physicalPage: page for page in snapshot.pages}
    nt_start = next(i for i, book in enumerate(snapshot.books) if book.id == "matthew")
    nt_ids = {book.id for book in snapshot.books[nt_start:]}
    for section_index, section in enumerate(sections):
        limits = {limit.chapter: limit.lastVerse for limit in section.book.verseLimits}
        if section.chapter not in limits or section.label_conflict:
            result.exceptions.append(
                {
                    "bookId": section.book.id,
                    "chapter": section.chapter,
                    "reason": "outline-chapter-conflict",
                }
            )
            continue
        is_nt = section.book.id in nt_ids
        following = sections[section_index + 1] if section_index + 1 < len(sections) else None
        next_chapter = (
            following.chapter
            if following and following.book.id == section.book.id
            else max(limits) + 1
        )
        if next_chapter != section.chapter + 1:
            # Some source bookmarks collapse Proverbs 10-30 into chapter X. Neither
            # footer repetition nor a numerical reset can certify those destinations.
            result.exceptions.append(
                {
                    "bookId": section.book.id,
                    "chapter": section.chapter,
                    "reason": "missing-intermediate-outline-chapters",
                }
            )
            continue
        if not is_nt and section.commentary_start is None:
            result.exceptions.append(
                {
                    "bookId": section.book.id,
                    "chapter": section.chapter,
                    "reason": "missing-commentary-section",
                }
            )
            continue
        pieces = []
        for number in range(
            section.start if is_nt else section.commentary_start or section.start, section.end + 1
        ):
            pieces.extend(body_pieces(pages[number], geometry[number], profile.layout))
        rationale = (
            f"Livro/capítulo comprovados no outline do PDF; perfil {profile.id}. "
            "Geometria exclui cabeçalhos/rodapés; não são usados índices ou introduções."
        )
        if not pieces:
            result.exceptions.append(
                {
                    "bookId": section.book.id,
                    "chapter": section.chapter,
                    "reason": "empty-or-unaligned-body-section",
                }
            )
            continue
        if not is_nt:
            chunks: list[Piece] = []
            for piece in pieces:
                if len(piece.text.strip()) < 20:
                    continue
                if chunks and (
                    sum(len(p.text) for p in chunks) + len(piece.text) > 10000 or len(chunks) >= 5
                ):
                    emit(
                        result,
                        snapshot,
                        section.book,
                        section.chapter,
                        chunks,
                        f"Cap. {section.chapter}",
                        rationale + " Numerações internas não são promovidas a versículos.",
                    )
                    chunks = []
                chunks.append(piece)
            if chunks:
                emit(
                    result,
                    snapshot,
                    section.book,
                    section.chapter,
                    chunks,
                    f"Cap. {section.chapter}",
                    rationale + " Numerações internas não são promovidas a versículos.",
                )
            continue
        markers: list[tuple[int, int, int]] = []
        for i, piece in enumerate(pieces):
            page = pages[piece.page]
            for marker in NT_MARKER.finditer(piece.text):
                at = piece.start + marker.start()
                evidence = [
                    span
                    for span in geometry[piece.page].spans
                    if utf16_to_index(page.text, span.startOffset)
                    <= at
                    < utf16_to_index(page.text, span.endOffset)
                ]
                if evidence and abs(evidence[0].x - 126) < 1.5:
                    markers.append((i, marker.start(), int(marker["verse"])))
        numbers = [marker[2] for marker in markers]
        if numbers != sorted(set(numbers)) or any(v > limits[section.chapter] for v in numbers):
            result.exceptions.append(
                {
                    "bookId": section.book.id,
                    "chapter": section.chapter,
                    "reason": "non-monotonic-primary-markers",
                }
            )
            continue
        for index, (piece_index, start, verse) in enumerate(markers):
            next_piece, next_offset, _ = (
                markers[index + 1] if index + 1 < len(markers) else (len(pieces), 0, 0)
            )
            note_pieces = []
            for i in range(piece_index, min(next_piece + 1, len(pieces))):
                piece = pieces[i]
                begin = piece.start + (start if i == piece_index else 0)
                end = piece.start + next_offset if i == next_piece else piece.end
                if begin < end:
                    note_pieces.append(
                        Piece(piece.page, begin, end, pages[piece.page].text[begin:end])
                    )
            emit(
                result,
                snapshot,
                section.book,
                section.chapter,
                note_pieces,
                f"{section.chapter}:{verse}",
                rationale + " Marcador de nota no recuo principal, separado de listas internas.",
                verse,
            )
    return result


def header_key(text: str) -> str:
    text = re.sub(r"\d[\d\s]*\.[\d\s.,–—-]*", "", text)
    return re.sub(r"[^a-z0-9]", "", normalize(text))


def extract_novo_at(
    snapshot: Snapshot, profile: Profile, geometry: dict[int, LayoutPage]
) -> Extraction:
    selected = [book for book in snapshot.books if book.id in (profile.bookIds or [])]
    result = Extraction(processed_pages=len(snapshot.pages), version=VERSION)
    starts = []
    previous = profile.firstPage - 1
    for book in selected:
        aliases = {
            header_key(alias) for alias in [*book.aliases, *profile.headingAliases.get(book.id, [])]
        }
        found = next(
            (
                page
                for page in snapshot.pages
                if page.physicalPage > previous
                and any(header_key(line) in aliases for line in page.text.splitlines()[:2])
            ),
            None,
        )
        if found is None:
            raise ValueError(f"Book heading not resolved: {book.id}")
        starts.append((book, found.physicalPage))
        result.sections.append(
            {"bookId": book.id, "page": found.physicalPage, "heading": found.text[:100]}
        )
        previous = found.physicalPage
    for book_index, (book, start_page) in enumerate(starts):
        end_page = (
            starts[book_index + 1][1] - 1 if book_index + 1 < len(starts) else len(snapshot.pages)
        )
        pending: tuple[int, int, int, str, list[Piece], list[dict[str, object]]] | None = None
        active = False
        last_chapter = 0
        limits = {limit.chapter: limit.lastVerse for limit in book.verseLimits}

        def flush(current_book: Book = book) -> None:
            nonlocal pending
            if pending:
                chapter, verse, end, raw, parts, extra = pending
                emit(
                    result,
                    snapshot,
                    current_book,
                    chapter,
                    parts,
                    raw,
                    f"Cabeçalho de {current_book.id} e marcador explícito seguido de travessão; "
                    f"perfil {profile.id}. Fonte serifada separada dos quadros sans-serif; "
                    "remissões não viram alvos.",
                    verse,
                    end,
                    extra,
                )
            pending = None

        for page in snapshot.pages[start_page - 1 : end_page]:
            for piece in body_pieces(page, geometry[page.physicalPage], profile.layout):
                cursor = 0
                valid_markers = list(AT_MARKER.finditer(piece.text))
                accepted_starts = {marker.start() for marker in valid_markers}
                events = sorted(
                    [
                        *valid_markers,
                        *[
                            marker
                            for marker in AT_BOUNDARY.finditer(piece.text)
                            if marker.start() not in accepted_starts
                        ],
                    ],
                    key=lambda marker: marker.start(),
                )
                for marker in events:
                    if pending:
                        pending[4].append(
                            Piece(
                                piece.page,
                                piece.start + cursor,
                                piece.start + marker.start(),
                                piece.text[cursor : marker.start()],
                            )
                        )
                    flush()
                    if marker.start() not in accepted_starts:
                        result.exceptions.append(
                            {
                                "bookId": book.id,
                                "page": piece.page,
                                "rawReference": marker[0][:60],
                                "reason": "malformed-primary-marker",
                            }
                        )
                        cursor = marker.end()
                        continue
                    chapter, verse = (
                        int(re.sub(r"\s", "", marker[group])) for group in ["chapter", "verse"]
                    )
                    tail = re.sub(r"\s", "", marker["tail"])
                    end = verse
                    extra: list[dict[str, object]] = []
                    reason = None
                    if not active and chapter != 1:
                        cursor = marker.end()
                        continue
                    active = True
                    raw = f"{chapter}:{verse}{tail}"
                    values = [int(v) for v in re.findall(r"\d+", tail)]
                    if "." in tail and len(values) == 2:
                        end_chapter, end_verse = values
                        if (
                            not chapter < end_chapter <= chapter + 100
                            or end_chapter not in limits
                            or not 1 <= end_verse <= limits[end_chapter]
                        ):
                            reason = "invalid-cross-chapter-range"
                        else:
                            end = limits.get(chapter, 0)
                            extra = [
                                {
                                    "bookId": book.id,
                                    "workId": f"work:{book.id}",
                                    "chapter": c,
                                    "verseStart": 1,
                                    "verseEnd": end_verse if c == end_chapter else limits[c],
                                    "versificationSchemeId": SCHEME,
                                }
                                for c in range(chapter + 1, end_chapter + 1)
                            ]
                    elif values:
                        if len(values) != 1 or ("," in tail and values[0] != verse + 1):
                            reason = "noncontiguous-target-needs-review"
                        else:
                            end = values[0]
                    if chapter < last_chapter or not 1 <= verse <= end <= limits.get(chapter, 0):
                        reason = "invalid-or-regressing-address"
                    if reason:
                        result.exceptions.append(
                            {
                                "bookId": book.id,
                                "rawReference": raw,
                                "page": piece.page,
                                "reason": reason,
                            }
                        )
                    else:
                        pending = (chapter, verse, end, raw, [], extra)
                        last_chapter = chapter
                    cursor = marker.start()
                if pending and cursor < len(piece.text):
                    pending[4].append(
                        Piece(piece.page, piece.start + cursor, piece.end, piece.text[cursor:])
                    )
        flush()
        if not active:
            result.exceptions.append({"bookId": book.id, "reason": "missing-first-note"})
    return result


def extract_structured(
    snapshot: Snapshot, profile: Profile, layout_path: Path, pdf: Path | None
) -> Extraction:
    if (
        profile.checksum != snapshot.checksum
        or snapshot.format != "scriptorium-commentary-source-v1"
    ):
        raise ValueError("Source/profile mismatch")
    layout = Layout.model_validate_json(layout_path.read_bytes())
    if (
        layout.format != "scriptorium-commentary-layout-v1"
        or layout.sourceChecksum != snapshot.checksum
    ):
        raise ValueError("Geometry/source mismatch")
    geometry = {page.physicalPage: page for page in layout.pages}
    if len(geometry) != len(layout.pages) or set(geometry) != {
        page.physicalPage for page in snapshot.pages
    }:
        raise ValueError("Missing/duplicate geometry pages")
    if profile.layout == "wesley-outline":
        if pdf is None:
            raise ValueError("Original PDF required for outline")
        with pdf.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != snapshot.checksum:
                raise ValueError("Original PDF checksum mismatch")
        return extract_wesley(snapshot, profile, geometry, pdf)
    if profile.layout == "novo-at-serif":
        return extract_novo_at(snapshot, profile, geometry)
    raise ValueError("Unknown calibrated layout")
