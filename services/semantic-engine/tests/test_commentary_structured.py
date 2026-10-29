import hashlib
from pathlib import Path
from typing import cast

import pytest

from app.commentary_extractor import Book, ChapterLimit, Page, Profile, Snapshot
from app.commentary_structured import (
    ChapterSection,
    LayoutPage,
    LayoutSpan,
    body_pieces,
    extract_novo_at,
    extract_structured,
    extract_wesley,
    header_key,
    sections_from_outline,
)


def book(identifier: str, name: str) -> Book:
    return Book(id=identifier, aliases=[name], verseLimits=[ChapterLimit(chapter=1, lastVerse=31)])


def snapshot(pages: list[str], books: list[Book]) -> Snapshot:
    return Snapshot(
        format="scriptorium-commentary-source-v1",
        checksum="a" * 64,
        title="Synthetic source",
        pages=[Page(physicalPage=i + 1, text=text) for i, text in enumerate(pages)],
        protectedSpans=[],
        books=books,
    )


def layout(page: Page, specs: list[tuple[str, str, float, float, float]]) -> LayoutPage:
    spans = []
    for text, family, x, y, height in specs:
        start = page.text.index(text)
        spans.append(
            LayoutSpan(
                startOffset=len(page.text[:start].encode("utf-16-le")) // 2,
                endOffset=len(page.text[: start + len(text)].encode("utf-16-le")) // 2,
                family=family,
                x=x,
                y=y,
                height=height,
            )
        )
    spans.sort(key=lambda span: span.startOffset)
    return LayoutPage(
        physicalPage=page.physicalPage,
        textChecksum=hashlib.sha256(page.text.encode()).hexdigest(),
        unmatched=0,
        spans=spans,
    )


def test_geometry_preserves_inline_greek_but_excludes_article_and_headers() -> None:
    page = Page(
        physicalPage=1,
        text=(
            "HEADER\nOriginal explanation λόγος SMALL CAPS continues.\n"
            "Article unrelated to the note."
        ),
    )
    evidence = layout(
        page,
        [
            ("HEADER", "serif", 30, 603, 8.5),
            ("Original explanation", "serif", 30, 500, 8.5),
            ("λόγος", "sans-serif", 110, 500, 8.5),
            ("SMALL CAPS", "serif", 140, 500, 6.8),
            ("continues.", "serif", 200, 500, 8.5),
            ("Article unrelated to the note.", "sans-serif", 30, 300, 8.5),
        ],
    )
    pieces = body_pieces(page, evidence, "novo-at-serif")
    assert [p.text for p in pieces] == ["Original explanation λόγος SMALL CAPS continues."]
    evidence.textChecksum = "wrong"
    with pytest.raises(ValueError, match="differs"):
        body_pieces(page, evidence, "novo-at-serif")


def test_utf16_alignment_and_unmatched_page_fail_closed() -> None:
    page = Page(physicalPage=1, text="😀\nOriginal synthetic explanation.")
    evidence = layout(page, [("Original synthetic explanation.", "serif", 30, 500, 8.5)])
    assert body_pieces(page, evidence, "novo-at-serif")[0].text == "Original synthetic explanation."
    evidence.unmatched = 1
    assert body_pieces(page, evidence, "novo-at-serif") == []


def test_novo_primary_ranges_are_not_comparative_references() -> None:
    text = (
        "Gênesis\n1.3 — Explicação sintética da passagem. Cf. Jo 1.1.\n"
        "1.4,5 - Explicação sintética dos dois versos.\n"
        "1.6,9 — Destinos não contíguos precisam de revisão.\n"
        "1.10-13 — Outra explicação sintética completa."
    )
    source = snapshot([text], [book("genesis", "Gênesis")])
    geometry = {
        1: layout(
            source.pages[0],
            [
                (line, "serif", 40, 550 - i * 20, 8.5)
                for i, line in enumerate(text.splitlines()[1:])
            ],
        )
    }
    profile = Profile(
        id="synthetic", checksum="a" * 64, layout="novo-at-serif", firstPage=1, bookIds=["genesis"]
    )
    result = extract_novo_at(source, profile, geometry)
    assert len(result.notes) == 3
    passages = [cast(dict[str, object], n["passage"]) for n in result.notes]
    assert [p["verseStart"] for p in passages] == [3, 4, 10]
    assert passages[1]["verseEnd"] == 5
    assert passages[2]["verseEnd"] == 13
    assert any(e["reason"] == "noncontiguous-target-needs-review" for e in result.exceptions)
    assert header_key("1 S a m u e l 1.3") != header_key("2 S a m u e l 1.3")


def test_outline_distinguishes_john_revelation_and_numbered_letters() -> None:
    books = [book("john", "John"), book("1-john", "1 John"), book("revelation", "Revelation")]
    flat = [
        (1, "NOTES ON THE GOSPEL ACCORDING TO ST. JOHN", 1),
        (2, "I", 2),
        (1, "NOTES ON THE FIRST EPISTLE OF ST. JOHN", 3),
        (2, "I", 4),
        (1, "NOTES ON THE REVELATION OF JOHN", 5),
        (2, "1", 6),
        (0, "Indexes", 7),
    ]
    sections, headings = sections_from_outline(flat, books, 7)
    assert [s.book.id for s in sections] == ["john", "1-john", "revelation"]
    assert [s.end for s in sections] == [2, 4, 6]
    assert len(headings) == 3
    with pytest.raises(ValueError, match="Missing"):
        sections_from_outline(flat[:2], books, 7)


def test_wesley_at_is_chapter_context_and_nt_nested_numbers_are_not_verses(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    genesis, matthew = book("genesis", "Genesis"), book("matthew", "Matthew")
    texts = [
        "1. Chapter argument, not a certified verse number.\n2. Another internal enumeration.",
        "1. First synthetic verse explanation.\n1. A nested list is still in the same note.",
        "2. Second synthetic verse explanation.",
    ]
    source = snapshot(texts, [genesis, matthew])
    geometry = {
        page.physicalPage: layout(
            page,
            [
                (line, "sans-serif", 162 if page.physicalPage == 2 and i else 126, 650 - i * 20, 11)
                for i, line in enumerate(page.text.splitlines())
            ],
        )
        for page in source.pages
    }
    monkeypatch.setattr(
        "app.commentary_structured.outline_sections",
        lambda *_: ([ChapterSection(genesis, 1, 1, 1, 1), ChapterSection(matthew, 1, 2, 3)], []),
    )
    profile = Profile(id="synthetic", checksum="a" * 64, layout="wesley-outline", firstPage=1)
    result = extract_wesley(source, profile, geometry, Path("unused.pdf"))
    assert len(result.notes) == 3
    assert result.notes[0]["relationScope"] == "chapter"
    assert "verseStart" not in cast(dict[str, object], result.notes[0]["passage"])
    assert "nested list" in cast(dict[str, object], result.notes[1]["analysis"])["summary"]


def test_collapsed_outline_does_not_publish_intermediate_chapters_as_one(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    genesis, matthew = book("genesis", "Genesis"), book("matthew", "Matthew")
    genesis.verseLimits.append(ChapterLimit(chapter=2, lastVerse=25))
    source = snapshot(
        ["1. This synthetic argument may include an unmarked next chapter."], [genesis, matthew]
    )
    geometry = {1: layout(source.pages[0], [(source.pages[0].text, "sans-serif", 126, 650, 11)])}
    monkeypatch.setattr(
        "app.commentary_structured.outline_sections",
        lambda *_: ([ChapterSection(genesis, 1, 1, 1, 1)], []),
    )
    result = extract_wesley(
        source,
        Profile(id="synthetic", checksum="a" * 64, layout="wesley-outline", firstPage=1),
        geometry,
        Path("unused"),
    )
    assert not result.notes
    assert result.exceptions[0]["reason"] == "missing-intermediate-outline-chapters"


def test_source_profile_mismatch_refuses_before_geometry_read() -> None:
    source = snapshot(["Synthetic"], [book("genesis", "Genesis")])
    with pytest.raises(ValueError, match="Source/profile"):
        extract_structured(
            source,
            Profile(id="synthetic", checksum="b" * 64, layout="wesley-outline", firstPage=1),
            Path("missing"),
            None,
        )


def test_malformed_next_marker_does_not_leak_into_previous_commentary() -> None:
    text = (
        "Gênesis\n1.11-13 — Explicação sintética sobre as plantas.\n"
        "1.14)15 — Nota danificada sobre outro assunto.\n"
        "1.16 — Explicação sintética sobre luminares."
    )
    source = snapshot([text], [book("genesis", "Gênesis")])
    geometry = {
        1: layout(
            source.pages[0],
            [
                (line, "serif", 40, 550 - i * 20, 8.5)
                for i, line in enumerate(text.splitlines()[1:])
            ],
        )
    }
    result = extract_novo_at(
        source,
        Profile(
            id="synthetic",
            checksum="a" * 64,
            layout="novo-at-serif",
            firstPage=1,
            bookIds=["genesis"],
        ),
        geometry,
    )
    assert len(result.notes) == 2
    assert "outro assunto" not in str(result.notes[0]["analysis"])
    assert any(e["reason"] == "malformed-primary-marker" for e in result.exceptions)


def test_novo_cross_chapter_range_has_explicit_additional_target() -> None:
    genesis = book("genesis", "Gênesis")
    genesis.verseLimits.append(ChapterLimit(chapter=2, lastVerse=25))
    text = "Gênesis\n1.30-2.3 — Explicação sintética de uma perícope. Cf. Jo 1.1."
    source = snapshot([text], [genesis])
    geometry = {1: layout(source.pages[0], [(text.splitlines()[1], "serif", 40, 550, 8.5)])}
    result = extract_novo_at(
        source,
        Profile(
            id="synthetic",
            checksum="a" * 64,
            layout="novo-at-serif",
            firstPage=1,
            bookIds=["genesis"],
        ),
        geometry,
    )
    assert result.notes[0]["relationScope"] == "pericope"
    targets = cast(list[dict[str, object]], result.notes[0]["additionalPassages"])
    assert len(targets) == 1
    assert targets[0]["chapter"] == 2 and targets[0]["verseEnd"] == 3
