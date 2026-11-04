import pytest

from app.commentary_extractor import (
    Book,
    ChapterLimit,
    Page,
    Profile,
    Snapshot,
    Span,
    batch_id,
    extract,
)


def source(pages: list[str]) -> Snapshot:
    return Snapshot(
        format="scriptorium-commentary-source-v1",
        checksum="a" * 64,
        title="Fonte sintética",
        pages=[Page(physicalPage=i + 1, text=text) for i, text in enumerate(pages)],
        protectedSpans=[],
        books=[
            Book(
                id="genesis",
                aliases=["Gênesis"],
                verseLimits=[
                    ChapterLimit(chapter=1, lastVerse=31),
                    ChapterLimit(chapter=2, lastVerse=25),
                ],
            )
        ],
    )


def profile() -> Profile:
    return Profile(id="synthetic", checksum="a" * 64, layout="notes-only", firstPage=1)


def test_consecutive_comma_targets_are_preserved_without_filling_gaps() -> None:
    result = extract(
        source(
            [
                "Gênesis\n1.3,4,5 Explicação sintética dos três versos consecutivos.\n"
                "1.7,9 Outra nota sintética com uma lacuna explícita."
            ]
        ),
        profile(),
    )
    assert len(result.notes) == 1
    assert result.notes[0]["rawReference"] == "1:3,4,5"
    passage = result.notes[0]["passage"]
    assert isinstance(passage, dict)
    assert passage["verseStart"] == 3 and passage["verseEnd"] == 5
    assert any(e["reason"] == "noncontiguous-target-needs-review" for e in result.exceptions)


def test_primary_marker_is_not_replaced_by_a_cross_reference() -> None:
    result = extract(
        source(
            [
                "Gênesis\n1.3 A nota explica a ordem divina. Cf. Jo 1.1-3.\n"
                "1.4 A nota seguinte explica a separação da luz."
            ]
        ),
        profile(),
    )
    assert len(result.notes) == 2
    assert result.notes[0]["passage"] == {
        "bookId": "genesis",
        "workId": "work:genesis",
        "chapter": 1,
        "verseStart": 3,
        "verseEnd": 3,
        "versificationSchemeId": "scriptorium-bcv-1",
    }
    assert result.notes[0]["additionalPassages"] == []


def test_keeps_a_continuation_across_physical_pages() -> None:
    result = extract(
        source(
            [
                "Gênesis\n1.1 A primeira parte da explicação continua",
                "na página seguinte, sem perder a sua evidência.\n"
                "1.2 Outra explicação completa da mesma fonte.",
            ]
        ),
        profile(),
    )
    assert len(result.notes) == 2
    assert len(result.notes[0]["fragments"]) == 2


def test_does_not_invent_contiguous_or_cross_chapter_ranges() -> None:
    result = extract(
        source(
            [
                "Gênesis\n1.1,3 Nota sobre destinos não contíguos.\n"
                "1.2-2.3 Nota sobre mais de um capítulo.\n"
                "1.4-6 Explicação de um intervalo explícito válido."
            ]
        ),
        profile(),
    )
    assert len(result.notes) == 2
    assert len(result.exceptions) == 1
    assert result.notes[0]["relationScope"] == "pericope"
    assert len(result.notes[0]["additionalPassages"]) == 1
    assert result.notes[1]["relationScope"] == "range"


def test_rejects_invalid_destinations_and_keeps_existing_editorial_spans() -> None:
    snapshot = source(
        [
            "Gênesis\n1.1 Explicação já integrada e protegida.\n"
            "1.99 Destino que não existe nesse capítulo."
        ]
    )
    snapshot.protectedSpans = [Span(physicalPage=1, startOffset=9, endOffset=45)]
    result = extract(snapshot, profile())
    assert result.protected == 1
    assert not result.notes
    assert result.exceptions[0]["reason"] == "invalid-canonical-address"


def test_refuses_unknown_layout_or_wrong_source() -> None:
    with pytest.raises(ValueError, match="not calibrated"):
        extract(source([]), profile().model_copy(update={"layout": "two-column-bible"}))
    with pytest.raises(ValueError, match="not calibrated"):
        extract(source([]), profile().model_copy(update={"checksum": "b" * 64}))


def test_bold_profile_ignores_a_wrapped_reference_in_prose() -> None:
    snapshot = source(
        [
            "Gênesis\n1:1 Explicação da fonte com uma referência a\n"
            "2:20 no corpo da nota, sem mudar o destino principal.\n"
            "1:2 Explicação seguinte, também completa."
        ]
    )
    calibrated = profile().model_copy(update={"markerStyle": "bold-font"})
    with pytest.raises(ValueError, match="font/layout"):
        extract(snapshot, calibrated)
    result = extract(snapshot, calibrated, {1: ["1:1", "1:2"]})
    assert len(result.notes) == 2
    assert not result.exceptions


def test_missing_heading_is_reported_and_batch_identity_is_stable() -> None:
    snapshot = source(["Gênesis\n1.1 Explicação completa e sintética da primeira nota."])
    snapshot.books.append(Book(id="exodus", aliases=["Êxodo"], verseLimits=[]))
    first, second = extract(snapshot, profile()), extract(snapshot, profile())
    assert first.exceptions[-1]["reason"] == "missing-book-heading"
    assert batch_id(snapshot.checksum, first.notes) == batch_id(snapshot.checksum, second.notes)


def test_quarantines_truncated_notes_and_reference_only_entries() -> None:
    result = extract(
        source(
            [
                "Gênesis\n1.1 Veja a nota de outra passagem.\n"
                "1.2 Esta explicação termina no meio de uma"
            ]
        ),
        profile(),
    )
    assert not result.notes
    assert len(result.exceptions) == 2


def test_plain_layout_does_not_promote_a_wrapped_cross_reference() -> None:
    snapshot = source(
        [
            "Gênesis\n1.1 Esta nota cita outra passagem (Rm\n"
            "8.32 e 1 Co 11.23), sem explicar essas outras passagens.\n"
            "1.2 Explicação seguinte completa e corretamente ancorada."
        ]
    )
    result = extract(snapshot, profile())
    assert len(result.notes) == 2
    assert not result.exceptions


def test_explicit_chapter_scope_is_not_forced_onto_verse_one() -> None:
    result = extract(
        source(
            [
                "Gênesis\n1.1 Comentário pontual completo.\n"
                "Cap. 2 Comentário sobre o capítulo inteiro, não só o verso inicial."
            ]
        ),
        profile(),
    )
    assert result.notes[-1]["relationScope"] == "chapter"
    assert "verseStart" not in result.notes[-1]["passage"]


def test_bold_single_chapter_notes_support_bare_verse_ranges() -> None:
    snapshot = source(
        [
            "Judas\n1-3 comentário sintético completo sobre um intervalo.\n"
            "5 outra explicação completa do mesmo livro."
        ]
    )
    snapshot.books = [
        Book(id="jude", aliases=["Judas"], verseLimits=[ChapterLimit(chapter=1, lastVerse=25)])
    ]
    result = extract(
        snapshot, profile().model_copy(update={"markerStyle": "bold-font"}), {1: ["1-3", "5"]}
    )
    assert len(result.notes) == 2
    assert result.notes[0]["relationScope"] == "range"
