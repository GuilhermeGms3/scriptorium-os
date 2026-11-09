import hashlib
from typing import cast

import pytest

from app.commentary_extractor import Book, ChapterLimit, Page, Piece, Snapshot
from app.commentary_structured import Layout, LayoutPage, LayoutSpan
from app.source_context import (
    Profile,
    Reference,
    ReferenceIndex,
    ReferencePage,
    extract,
    sections,
    source_pieces,
)


def fixture(text: str, **overrides: object) -> tuple[Snapshot, Layout, ReferenceIndex, Profile]:
    source = Snapshot(
        format="scriptorium-commentary-source-v1",
        checksum="a" * 64,
        title="Synthetic catechism",
        pages=[Page(physicalPage=1, text=text)],
        protectedSpans=[],
        books=[
            Book(id="john", aliases=["João"], verseLimits=[ChapterLimit(chapter=1, lastVerse=51)])
        ],
    )
    layout = Layout(
        format="scriptorium-commentary-layout-v1",
        sourceChecksum=source.checksum,
        pages=[
            LayoutPage(
                physicalPage=1,
                textChecksum=hashlib.sha256(text.encode()).hexdigest(),
                unmatched=0,
                spans=[
                    LayoutSpan(
                        startOffset=0, endOffset=len(text), family="serif", x=60, y=300, height=12
                    )
                ],
            )
        ],
    )
    index = ReferenceIndex(
        sourceChecksum=source.checksum,
        snapshotChecksum="snapshot",
        pages=[ReferencePage(physicalPage=1, references=[])],
    )
    profile = Profile.model_validate(
        {
            "id": "fixture",
            "checksum": source.checksum,
            "kind": "catechism",
            "strategy": "numbered-paragraphs",
            "firstPage": 1,
            "lastPage": 1,
            "headingPattern": r"^\d+\.\s*",
            "bodyHeight": 12,
            "authorLabel": "Synthetic institution",
            "traditionLabel": "Synthetic tradition",
            **overrides,
        }
    )
    return source, layout, index, profile


def test_nested_numbered_lists_do_not_become_new_catechism_paragraphs() -> None:
    text = "117. Synthetic paragraph.\n1. Allegorical.\n2. Moral.\n118. Next paragraph."
    groups = sections([Piece(1, 0, len(text), text)], r"^\d+\.\s*", True)
    assert [group.locator for group in groups] == ["117.", "118."]
    assert "2. Moral." in groups[0].pieces[0].text


def test_confessional_reference_is_citation_not_universal_commentary() -> None:
    text = "1. Synthetic teaching quotes João 1:1 without proving universal agreement."
    source, layout, index, profile = fixture(text)
    start = text.index("João")
    index.pages[0].references = [
        Reference(
            rawReference="João 1:1",
            startOffset=start,
            endOffset=start + 8,
            bookId="john",
            chapter=1,
            verseStart=1,
        )
    ]
    result = extract(source, layout, index, profile, "snapshot")
    note = result.notes[0]
    assert note["relationType"] == "cites"
    assert note["referenceRole"] == "proof-text"
    analysis = cast(dict[str, object], note["analysis"])
    assert analysis["summary"] == text
    context = cast(dict[str, object], analysis["sourceContext"])
    assert context["traditionLabel"] == "Synthetic tradition"


def test_no_reference_means_no_invented_biblical_destination() -> None:
    source, layout, index, profile = fixture("1. Synthetic doctrine without biblical address.")
    result = extract(source, layout, index, profile, "snapshot")
    assert not result.notes
    assert result.exceptions[0]["reason"] == "no-explicit-biblical-target"


def test_numbered_homily_footnote_is_not_first_epistle_of_john() -> None:
    text = (
        "Conferência 001 - Synthetic.\nOpening biblical lemma 1.\nAnálise\n"
        "Translator intro.\n01\nOriginal exposition that is sufficiently long."
    )
    source, layout, index, profile = fixture(
        text,
        strategy="john-conferences",
        kind="patristic-exposition",
        headingPattern=r"^Conferência \d+[^\n]*",
        expectedSections=1,
    )
    index.pages[0].footnotes = [
        Reference(
            rawReference="João 1:1",
            startOffset=0,
            endOffset=1,
            bookId="john",
            chapter=1,
            verseStart=1,
            footnoteLabel="1",
        )
    ]
    result = extract(source, layout, index, profile, "snapshot")
    assert len(result.notes) == 1
    note = result.notes[0]
    assert cast(dict[str, object], note["passage"])["bookId"] == "john"
    assert "Translator intro" not in cast(dict[str, str], note["analysis"])["summary"]


def test_book_exposition_never_uses_author_chapter_number_as_biblical_verse() -> None:
    text = "CAPÍTULO XII\nSynthetic exposition with no individual biblical destination."
    source, layout, index, profile = fixture(
        text,
        strategy="book-exposition",
        kind="patristic-exposition",
        headingPattern=r"^CAPÍTULO [IVXLCDM]+",
        bookId="john",
    )
    result = extract(source, layout, index, profile, "snapshot")
    assert result.notes[0]["relationScope"] == "book"
    assert "chapter" not in cast(dict[str, object], result.notes[0]["passage"])


def test_profile_index_and_page_integrity_are_required() -> None:
    source, layout, index, profile = fixture("1. Synthetic paragraph for checksum validation.")
    with pytest.raises(ValueError, match="snapshot"):
        extract(source, layout, index, profile, "other")
    layout.pages[0].unmatched = 1
    with pytest.raises(ValueError, match="Unaligned"):
        extract(source, layout, index, profile, "snapshot")


def test_historic_psalter_and_invalid_addresses_remain_exceptions() -> None:
    text = "1. Synthetic paragraph mentions an unconverted historical psalm and bad verse."
    source, layout, index, profile = fixture(text)
    index.pages[0].references = [
        Reference(
            rawReference="Sl 9:1",
            startOffset=4,
            endOffset=8,
            bookId="psalms",
            chapter=9,
            verseStart=1,
        ),
        Reference(
            rawReference="Jo 1:99",
            startOffset=9,
            endOffset=12,
            bookId="john",
            chapter=1,
            verseStart=99,
        ),
    ]
    result = extract(source, layout, index, profile, "snapshot")
    assert not result.notes
    assert len(result.exceptions) == 3


def test_missing_source_section_blocks_staging() -> None:
    source, layout, index, profile = fixture(
        "1. Synthetic paragraph without the expected second section.", expectedSections=2
    )
    with pytest.raises(ValueError, match="Expected"):
        extract(source, layout, index, profile, "snapshot")


def test_inline_note_marker_is_preserved_without_importing_small_footer_notes() -> None:
    text = "Original paragraph 9.\n9 Small editorial footnote."
    source, layout, _, profile = fixture(
        text,
        strategy="book-exposition",
        kind="patristic-exposition",
        bodyHeight=13.5,
        extraHeights=[10.5],
    )
    layout.pages[0].spans = [
        LayoutSpan(startOffset=0, endOffset=19, family="serif", x=60, y=300, height=13.5),
        LayoutSpan(startOffset=19, endOffset=21, family="serif", x=220, y=303, height=10.5),
        LayoutSpan(startOffset=22, endOffset=len(text), family="serif", x=60, y=100, height=10.5),
    ]
    pieces = source_pieces(source, layout, profile)
    assert pieces[0].text == text[:21]
    assert len(pieces) == 1
