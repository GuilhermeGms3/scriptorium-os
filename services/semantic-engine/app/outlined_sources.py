"""Edition-pinned book contexts and primary lemma sections from PDF destinations.

No database writes, generated explanations or LLM. Invalid headings are boundaries,
not permission to continue assigning their text to the previous biblical passage.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Sequence
from difflib import SequenceMatcher
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.commentary_extractor import SCHEME, Extraction, Piece, Snapshot
from app.commentary_structured import Layout, utf16_to_index
from app.source_context import chunks, publish_staging


class Segment(BaseModel):
    first: int
    last: int
    books: list[str]


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    checksum: str = Field(pattern=r"^[a-f0-9]{64}$")
    strategy: Literal["homilies", "intertextual", "handbook"]
    author: str
    segments: list[Segment]
    maps: dict[int, str] = Field(default_factory=dict)


class Heading(BaseModel):
    page: int
    title: str
    x: float | None = None
    y: float | None = None


def roman(value: str) -> int:
    if value.isdigit():
        return int(value)
    numbers = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}
    total = previous = 0
    for symbol in reversed(value):
        n = numbers[symbol]
        total += -n if n < previous else n
        previous = max(previous, n)
    return total


def targets(title: str, book: str, snapshot: Snapshot, homily: bool) -> list[dict[str, object]]:
    """Only explicit closed lemmas; commas enumerate verses, never fill their gaps."""
    text = re.sub(r"\s+", "", title)
    if homily:
        text = re.sub(r"^Matthew", "", text)
        match = re.fullmatch(r"([IVX]+|\d+)\.(\d+(?:[-,]\d+)*)\.?", text)
    else:
        aliases = next(b.aliases for b in snapshot.books if b.id == book)
        for alias in sorted(aliases, key=len, reverse=True):
            compact = re.sub(r"\s+", "", alias)
            if text.casefold().startswith(compact.casefold()):
                text = text[len(compact) :]
                break
        text = text.lstrip("[|\"'(").rstrip("]) ")
        cross_chapter = re.fullmatch(r"(\d+)[.:](\d+)[–—-](\d+)[.:](\d+)", text)
        if cross_chapter:
            first, start, last, end = map(int, cross_chapter.groups())
            limits = {
                x.chapter: x.lastVerse
                for b in snapshot.books
                if b.id == book
                for x in b.verseLimits
            }
            if not (
                first < last
                and first in limits
                and last in limits
                and 1 <= start <= limits[first]
                and 1 <= end <= limits[last]
            ):
                return []
            return [
                {
                    "bookId": book,
                    "workId": f"work:{book}",
                    "chapter": chapter,
                    "verseStart": start if chapter == first else 1,
                    "verseEnd": end if chapter == last else limits[chapter],
                    "versificationSchemeId": SCHEME,
                }
                for chapter in range(first, last + 1)
            ]
        match = re.fullmatch(r"(\d+)[.:](\d+(?:[-–—,]\d+)*)(?:\.)?", text)
    if not match:
        return []
    chapter = roman(match[1]) if homily else int(match[1])
    limits = {x.chapter: x.lastVerse for b in snapshot.books if b.id == book for x in b.verseLimits}
    result: list[dict[str, object]] = []
    for part in match[2].split(","):
        values = re.split(r"[-–—]", part)
        start, end = int(values[0]), int(values[-1])
        if not 1 <= start <= end <= limits.get(chapter, 0):
            return []
        result.append(
            {
                "bookId": book,
                "workId": f"work:{book}",
                "chapter": chapter,
                "verseStart": start,
                "verseEnd": end,
                "versificationSchemeId": SCHEME,
            }
        )
    return result


def heading_offset(heading: Heading, snapshot: Snapshot, layout: Layout) -> int | None:
    page = snapshot.pages[heading.page - 1]
    # Homilies and handbook chapters start on a fresh physical page.
    if heading.y is None:
        return 0
    compact = re.sub(r"\s+", "", heading.title).lstrip("[|\"'(").rstrip("]) ")
    pattern = r"(?m)^[^\w\n]{0,8}" + r"\s*".join(re.escape(c) for c in compact)
    candidates: list[tuple[float, int]] = []
    for match in re.finditer(pattern, page.text, re.I):
        start = match.start()
        nearby = [
            s
            for s in layout.pages[heading.page - 1].spans
            if utf16_to_index(page.text, s.startOffset)
            <= start
            < utf16_to_index(page.text, s.endOffset)
        ]
        for span in nearby:
            distance = abs(span.y - heading.y) + abs(span.x - (heading.x or span.x))
            if distance < 55:
                candidates.append((distance, start))
    return min(candidates)[1] if candidates else None


def extract(
    snapshot: Snapshot, layout: Layout, headings: list[Heading], profile: Profile
) -> Extraction:
    if profile.checksum != snapshot.checksum or layout.sourceChecksum != snapshot.checksum:
        raise ValueError("Edition checksum mismatch")
    if len(layout.pages) != len(snapshot.pages):
        raise ValueError("Page count mismatch")
    for page, geometry in zip(snapshot.pages, layout.pages, strict=True):
        if (
            geometry.unmatched
            or geometry.textChecksum != hashlib.sha256(page.text.encode()).hexdigest()
        ):
            raise ValueError("Unaligned source page")
    result = Extraction(version="outlined-sources-v1")
    duplicates: set[int] = set()
    if profile.strategy == "intertextual":
        for before, after in zip(snapshot.pages, snapshot.pages[1:], strict=False):
            previous_text, next_text = (re.sub(r"\s+", "", p.text) for p in [before, after])
            if (
                min(len(previous_text), len(next_text)) > 800
                and SequenceMatcher(
                    None, previous_text[:500], next_text[:500], autojunk=False
                ).ratio()
                > 0.85
                and SequenceMatcher(None, previous_text, next_text, autojunk=False).ratio() > 0.92
            ):
                duplicates.add(after.physicalPage)
                result.exceptions.append(
                    {"page": after.physicalPage, "reason": "adjacent-duplicate-page"}
                )
    for segment in profile.segments:
        if not 1 <= segment.first <= segment.last <= len(snapshot.pages):
            raise ValueError("Segment outside physical pages")
        if any(book not in {b.id for b in snapshot.books} for book in segment.books):
            raise ValueError("Unknown biblical book")
        selected = [
            h
            for h in headings
            if segment.first <= h.page <= segment.last and h.page not in duplicates
        ]
        boundaries: list[tuple[Heading, int]] = []
        for heading in selected:
            offset = heading_offset(heading, snapshot, layout)
            if offset is None:
                # Never propagate past an unresolved boundary on the same page.
                offset = 0
                result.exceptions.append(
                    {
                        "page": heading.page,
                        "locator": heading.title,
                        "reason": "outline-position-unresolved",
                    }
                )
                heading = heading.model_copy(update={"title": f"UNRESOLVED: {heading.title}"})
            boundaries.append((heading, offset))
        boundaries.sort(key=lambda entry: (entry[0].page, entry[1]))
        if profile.strategy == "handbook":
            boundaries = [(Heading(page=segment.first, title="Contexto do livro"), 0)]
        for i, (heading, offset) in enumerate(boundaries):
            following, stop = (
                boundaries[i + 1]
                if i + 1 < len(boundaries)
                else (Heading(page=segment.last + 1, title="end"), 0)
            )
            if profile.strategy == "handbook":
                destinations: list[dict[str, object]] = [
                    {"bookId": book, "workId": f"work:{book}", "versificationSchemeId": SCHEME}
                    for book in segment.books
                ]
            else:
                destinations = targets(
                    heading.title, segment.books[0], snapshot, profile.strategy == "homilies"
                )
            if not destinations:
                result.exceptions.append(
                    {
                        "page": heading.page,
                        "locator": heading.title,
                        "reason": "not-a-resolved-primary-lemma",
                    }
                )
                continue
            pieces: list[Piece] = []
            for number in range(heading.page, min(following.page, segment.last) + 1):
                if number in duplicates:
                    continue
                page = snapshot.pages[number - 1]
                start = offset if number == heading.page else 0
                end = stop if number == following.page else len(page.text)
                if end <= start:
                    continue
                # Homily footnotes and running folios are not Chrysostom's main exposition.
                if profile.strategy == "homilies":
                    body_lines = [
                        s.y
                        for s in layout.pages[number - 1].spans
                        if abs(s.height - 11) < 0.15 and 105 < s.y < 720
                    ]
                    for span in layout.pages[number - 1].spans:
                        inline = span.height < 11 and any(abs(span.y - y) < 6 for y in body_lines)
                        if (abs(span.height - 11) > 0.15 and not inline) or not 105 < span.y < 720:
                            continue
                        a, b = (
                            utf16_to_index(page.text, n) for n in [span.startOffset, span.endOffset]
                        )
                        if start <= a < b <= end:
                            if (
                                pieces
                                and pieces[-1].page == number
                                and not page.text[pieces[-1].end : a].strip()
                            ):
                                pieces[-1].end = b
                                pieces[-1].text = page.text[pieces[-1].start : b]
                            else:
                                pieces.append(Piece(number, a, b, page.text[a:b]))
                else:
                    pieces.append(Piece(number, start, end, page.text[start:end]))
            result.sections.append(
                {
                    "locator": heading.title,
                    "firstPage": heading.page,
                    "lastPage": min(following.page, segment.last),
                    "targets": destinations,
                }
            )
            if snapshot.protectedSpans:
                # Do not suppress a whole introductory page because an older reviewed
                # excerpt occupies a few lines. Preserve those exact spans instead.
                unprotected: list[Piece] = []
                for piece in pieces:
                    cuts = [(piece.start, piece.end)]
                    for protected in snapshot.protectedSpans:
                        if protected.physicalPage != piece.page:
                            continue
                        text = snapshot.pages[piece.page - 1].text
                        a, b = (
                            utf16_to_index(text, n)
                            for n in [protected.startOffset, protected.endOffset]
                        )
                        cuts = [
                            (x, y)
                            for start, end in cuts
                            for x, y in [(start, min(end, a)), (max(start, b), end)]
                            if x < y
                        ]
                    unprotected.extend(
                        Piece(piece.page, a, b, snapshot.pages[piece.page - 1].text[a:b])
                        for a, b in cuts
                        if b - a >= 20
                    )
                pieces = unprotected
            for part in (
                [[piece] for piece in pieces] if profile.strategy == "handbook" else chunks(pieces)
            ):
                emit(result, snapshot, profile, heading.title, part, destinations)
    result.processed_pages = sum(s.last - s.first + 1 for s in profile.segments)
    return result


def emit(
    result: Extraction,
    snapshot: Snapshot,
    profile: Profile,
    locator: str,
    pieces: list[Piece],
    destinations: list[dict[str, object]],
) -> None:
    summary = " ".join(p.text.strip() for p in pieces)
    valid = 20 <= len(summary) <= 12000 and all(
        20 <= len(p.text.strip()) <= 12000
        and snapshot.pages[p.page - 1].text.count(p.text.strip()) == 1
        for p in pieces
    )
    protected = any(
        s.physicalPage == p.page
        and s.startOffset < len(snapshot.pages[p.page - 1].text[: p.end].encode("utf-16-le")) // 2
        and s.endOffset > len(snapshot.pages[p.page - 1].text[: p.start].encode("utf-16-le")) // 2
        for p in pieces
        for s in snapshot.protectedSpans
    )
    if not valid or protected:
        result.exceptions.append(
            {
                "locator": locator,
                "page": pieces[0].page,
                "reason": "protected-span" if protected else "fragment-size-or-uniqueness",
            }
        )
        return
    handbook = profile.strategy == "handbook"
    if handbook:
        book = next(b for b in snapshot.books if b.id == destinations[0]["bookId"])
        heading = next(
            (
                line.strip()
                for line in summary.splitlines()
                if line.isupper() and 5 < len(line.strip()) < 90
            ),
            "Contexto do livro",
        )
        locator = f"{book.aliases[0]} · {heading} · p. {pieces[0].page}"
    rationale = (
        "Contexto introdutório do livro segundo esta fonte, não comentário de cada versículo."
        if handbook
        else "Lema principal explícito do sumário da edição; "
        "remissões internas não são destinos primários."
    )
    visual = next(
        (p for p in pieces if p.page in profile.maps and profile.maps[p.page] in p.text), None
    )
    for target in destinations:
        result.notes.append(
            {
                "sourceChecksum": snapshot.checksum,
                "fragments": [{"physicalPage": p.page, "quote": p.text.strip()} for p in pieces],
                "rawReference": locator[:200],
                "passage": target,
                "additionalPassages": [],
                "relationScope": "book"
                if handbook
                else "verse"
                if target["verseStart"] == target["verseEnd"]
                else "range",
                "relationType": "discusses",
                "domains": ["historical-context", "geography"]
                if visual
                else ["historical-context"]
                if handbook
                else ["patristics", "exegesis"]
                if profile.strategy == "homilies"
                else ["exegesis", "hermeneutics"],
                "analysis": {
                    "title": f"{snapshot.title} · {locator}"[:200],
                    "summary": summary,
                    "mode": "source-excerpt",
                    "rationale": rationale,
                    "contentType": "historical-context" if handbook else "source-commentary",
                    "sourceContext": {
                        "kind": "biblical-handbook"
                        if handbook
                        else "patristic-exposition"
                        if profile.strategy == "homilies"
                        else "intertextual-commentary",
                        "locator": locator[:300],
                        "sectionPath": [locator[:300]],
                        "authorLabel": profile.author,
                    },
                    **(
                        {
                            "sourceVisual": {
                                "physicalPage": visual.page,
                                "kind": "map",
                                "caption": profile.maps[visual.page],
                            }
                        }
                        if visual
                        else {}
                    ),
                    "limitations": [
                        rationale,
                        "Ligação determinística; auditoria pendente, "
                        "não revisão humana individual.",
                    ],
                },
            }
        )


def main() -> None:
    import argparse

    from pypdf import PdfReader

    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["snapshot", "layout", "pdf", "profile", "output"]:
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    snapshot = Snapshot.model_validate_json(args.snapshot.read_bytes())
    if hashlib.sha256(args.pdf.read_bytes()).hexdigest() != snapshot.checksum:
        raise ValueError("Original PDF checksum mismatch")
    reader = PdfReader(args.pdf)
    profile = Profile.model_validate_json(args.profile.read_bytes())
    headings: list[Heading] = []

    def visit(items: Sequence[object]) -> None:
        from pypdf.generic import Destination

        for item in items:
            if isinstance(item, list):
                visit(item)
            elif isinstance(item, Destination):
                physical_index = reader.get_destination_page_number(item)
                if physical_index is None:
                    raise ValueError("Outline points outside the PDF")
                headings.append(
                    Heading(
                        page=physical_index + 1,
                        title=str(item.title).strip(),
                        x=float(item.left)
                        if item.left is not None and profile.strategy == "intertextual"
                        else None,
                        y=float(item.top)
                        if item.top is not None and profile.strategy == "intertextual"
                        else None,
                    )
                )

    visit(reader.outline)
    for page, caption in profile.maps.items():
        if not reader.pages[page - 1].images or caption not in snapshot.pages[page - 1].text:
            raise ValueError("Map requires an image and literal caption on its source page")
    result = extract(
        snapshot, Layout.model_validate_json(args.layout.read_bytes()), headings, profile
    )
    publish_staging(result, snapshot, args.output)


if __name__ == "__main__":
    main()
