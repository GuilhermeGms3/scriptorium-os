import hashlib
from typing import cast

import pytest

from app.commentary_extractor import Book, ChapterLimit, Page, Snapshot, Span
from app.commentary_structured import Layout, LayoutPage, LayoutSpan
from app.outlined_sources import Heading, Profile, Segment, extract, targets


def fixture() -> tuple[Snapshot, Layout]:
    text = "Synthetic contextual explanation with a literal map caption: MAP OF THE REGION."
    snapshot = Snapshot(
        format="scriptorium-commentary-source-v1",
        checksum="a" * 64,
        title="Synthetic book",
        pages=[Page(physicalPage=1, text=text)],
        protectedSpans=[],
        books=[
            Book(
                id="matthew",
                aliases=["Mateus"],
                verseLimits=[ChapterLimit(chapter=1, lastVerse=25)],
            )
        ],
    )
    layout = Layout(
        format="scriptorium-commentary-layout-v1",
        sourceChecksum=snapshot.checksum,
        pages=[
            LayoutPage(
                physicalPage=1,
                unmatched=0,
                textChecksum=hashlib.sha256(text.encode()).hexdigest(),
                spans=[
                    LayoutSpan(
                        startOffset=0, endOffset=len(text), family="serif", height=11, x=60, y=500
                    )
                ],
            )
        ],
    )
    return snapshot, layout


def test_explicit_homily_lemma_preserves_disjoint_verses() -> None:
    snapshot, _ = fixture()
    result = targets("Matthew I. 1, 3.", "matthew", snapshot, True)
    assert [p["verseStart"] for p in result] == [1, 3]
    assert targets("Matthew I. 26.", "matthew", snapshot, True) == []
    assert targets("Homily XX.", "matthew", snapshot, True) == []


def test_corrupted_intertextual_heading_is_not_repaired_by_guessing() -> None:
    snapshot, _ = fixture()
    assert targets("[T21-26", "matthew", snapshot, False) == []
    assert targets("Mateus 1.1-17", "matthew", snapshot, False)[0]["verseEnd"] == 17
    assert targets("Mateus 1.1—2.3", "matthew", snapshot, False) == []


def test_homily_ordinal_is_not_the_chapter_and_wrong_book_is_rejected() -> None:
    snapshot, _ = fixture()
    snapshot.books.extend(
        Book(id=book, aliases=[book], verseLimits=[ChapterLimit(chapter=1, lastVerse=25)])
        for book in ["acts", "romans"]
    )
    assert targets("Homily II on Acts i. 6.", "acts", snapshot, True)[0]["chapter"] == 1
    assert targets("Homily I on Rom. i. 1, 2.", "romans", snapshot, True)[1]["verseStart"] == 2
    assert targets("Homily I on Acts i. 1.", "romans", snapshot, True) == []
    assert targets("Homily I.", "acts", snapshot, True) == []
    assert targets("Homily I on Acts i. 1. ii. 2.", "acts", snapshot, True) == []


def test_opt_in_quarantine_never_publishes_unaligned_text() -> None:
    snapshot, layout = fixture()
    profile = Profile(
        checksum=snapshot.checksum,
        strategy="homilies",
        author="Synthetic author",
        segments=[Segment(first=1, last=1, books=["matthew"])],
        quarantine_unaligned_pages=True,
    )
    layout.pages[0].unmatched = 1
    result = extract(snapshot, layout, [Heading(page=1, title="Matthew I. 1.")], profile)
    assert not result.notes
    assert result.exceptions[0]["reason"] == "unaligned-page-quarantined"
    layout.pages[0].textChecksum = "wrong"
    with pytest.raises(ValueError, match="Unaligned"):
        extract(snapshot, layout, [], profile)


def test_opening_only_does_not_publish_later_homily_application_as_the_lemma() -> None:
    snapshot, layout = fixture()
    snapshot.pages = []
    layout.pages = []
    for number in range(1, 4):
        text = f"Synthetic page {number} of the homily. " + "Contextual argument. " * 230
        snapshot.pages.append(Page(physicalPage=number, text=text))
        layout.pages.append(
            LayoutPage(
                physicalPage=number,
                unmatched=0,
                textChecksum=hashlib.sha256(text.encode()).hexdigest(),
                spans=[
                    LayoutSpan(
                        startOffset=0, endOffset=len(text), family="serif", height=11, x=100, y=500
                    )
                ],
            )
        )
    profile = Profile(
        checksum=snapshot.checksum,
        strategy="homilies",
        author="Synthetic",
        segments=[Segment(first=1, last=3, books=["matthew"])],
        opening_excerpt_only=True,
    )
    result = extract(snapshot, layout, [Heading(page=1, title="Matthew I. 1.")], profile)
    assert len(result.notes) == 1
    assert "Synthetic page 1" in str(result.notes[0]["analysis"])
    assert "Synthetic page 2" not in str(result.notes[0]["analysis"])


def test_explicit_cross_chapter_range_respects_both_endpoints() -> None:
    snapshot, _ = fixture()
    snapshot.books[0].verseLimits.append(ChapterLimit(chapter=2, lastVerse=23))
    result = targets("Mateus 1.18—2.3", "matthew", snapshot, False)
    assert [(x["chapter"], x["verseStart"], x["verseEnd"]) for x in result] == [
        (1, 18, 25),
        (2, 1, 3),
    ]


def test_handbook_remains_work_level_and_has_literal_visual_metadata() -> None:
    snapshot, layout = fixture()
    profile = Profile(
        checksum=snapshot.checksum,
        strategy="handbook",
        author="Synthetic author",
        segments=[Segment(first=1, last=1, books=["matthew"])],
        maps={1: "MAP OF THE REGION"},
    )
    note = extract(snapshot, layout, [], profile).notes[0]
    assert note["relationScope"] == "book"
    assert "chapter" not in cast(dict[str, object], note["passage"])
    assert cast(dict[str, object], note["analysis"])["sourceVisual"] == {
        "physicalPage": 1,
        "kind": "map",
        "caption": "MAP OF THE REGION",
    }


def test_preserves_old_contextual_spans_without_discarding_rest_of_page() -> None:
    snapshot, layout = fixture()
    snapshot.protectedSpans = [Span(physicalPage=1, startOffset=0, endOffset=20)]
    profile = Profile(
        checksum=snapshot.checksum,
        strategy="handbook",
        author="Synthetic author",
        segments=[Segment(first=1, last=1, books=["matthew"])],
    )
    note = extract(snapshot, layout, [], profile).notes[0]
    assert (
        cast(dict[str, object], note["analysis"])["summary"] == snapshot.pages[0].text[20:].strip()
    )


def test_unresolved_boundary_does_not_extend_previous_passage() -> None:
    snapshot, layout = fixture()
    # Both boundaries coincide: the first must not consume the second section.
    profile = Profile(
        checksum=snapshot.checksum,
        strategy="homilies",
        author="Synthetic author",
        segments=[Segment(first=1, last=1, books=["matthew"])],
    )
    result = extract(
        snapshot,
        layout,
        [Heading(page=1, title="Matthew I. 1."), Heading(page=1, title="Broken heading")],
        profile,
    )
    assert not result.notes


def test_running_folio_and_header_do_not_discard_main_homily_body() -> None:
    snapshot, layout = fixture()
    body = snapshot.pages[0].text
    text = body + "\n29\nMatthew I. 1."
    snapshot.pages[0].text = text
    geometry = layout.pages[0]
    geometry.textChecksum = hashlib.sha256(text.encode()).hexdigest()
    geometry.spans.extend(
        [
            LayoutSpan(
                startOffset=len(body) + 1,
                endOffset=len(body) + 3,
                family="serif",
                height=11,
                x=500,
                y=91.2,
            ),
            LayoutSpan(
                startOffset=len(body) + 4,
                endOffset=len(text),
                family="serif",
                height=11,
                x=500,
                y=737.8,
            ),
        ]
    )
    profile = Profile(
        checksum=snapshot.checksum,
        strategy="homilies",
        author="Synthetic author",
        segments=[Segment(first=1, last=1, books=["matthew"])],
    )
    result = extract(snapshot, layout, [Heading(page=1, title="Matthew I. 1.")], profile)
    assert len(result.notes) == 1
    assert cast(dict[str, object], result.notes[0]["analysis"])["summary"] == body


def test_refuses_wrong_edition_unaligned_layout_and_invalid_bounds() -> None:
    snapshot, layout = fixture()
    profile = Profile(
        checksum="b" * 64,
        strategy="handbook",
        author="Synthetic author",
        segments=[Segment(first=1, last=1, books=["matthew"])],
    )
    with pytest.raises(ValueError, match="checksum"):
        extract(snapshot, layout, [], profile)
    profile.checksum = snapshot.checksum
    profile.segments[0].last = 2
    with pytest.raises(ValueError, match="physical"):
        extract(snapshot, layout, [], profile)
    profile.segments[0].last = 1
    layout.pages[0].unmatched = 1
    with pytest.raises(ValueError, match="Unaligned"):
        extract(snapshot, layout, [], profile)
