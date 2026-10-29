import pytest

from app.commentary_extractor import Snapshot
from app.cultural_commentary import CHECKSUM, extract, page_book, referral_only


def snapshot(text: str) -> Snapshot:
    return Snapshot.model_validate(
        {
            "format": "scriptorium-commentary-source-v1",
            "checksum": CHECKSUM,
            "title": "Synthetic Keener layout fixture",
            "protectedSpans": [],
            "pages": [{"physicalPage": 50, "text": text}],
            "books": [
                {
                    "id": "luke",
                    "aliases": ["Lucas", "Luke"],
                    "verseLimits": [{"chapter": 5, "lastVerse": 39}],
                }
            ],
        }
    )


def test_primary_lemma_not_internal_crossreference_and_discontinuous_verses() -> None:
    source = snapshot(
        "LUCAS 5:8-11\n5:8, 9. "
        + "Explicación cultural de la escena. " * 8
        + " Véase Isa. 6:5 y Jer. 1:6.\n5:10. "
        + "Otra explicación contextual. " * 8
    )
    result = extract(source)
    assert result.notes
    assert {note["passage"]["bookId"] for note in result.notes} == {"luke"}
    assert {note["passage"]["verseStart"] for note in result.notes} == {8, 9, 10}
    assert all(note["analysis"]["mode"] == "source-excerpt" for note in result.notes)
    assert all(note["analysis"]["summary"] in source.pages[0].text for note in result.notes)


def test_short_referral_is_not_published_as_cultural_explanation() -> None:
    assert referral_only(
        "Ver el comentario sobre Juan 1:1 y sobre Lucas 5:8 para detalles adicionales."
    )
    assert referral_only(
        "Con respecto a las ropas lavadas, cf. 3:4,5 con 7:14, y ver el comentario sobre 3:4."
    )
    assert not referral_only(
        "Los pagos se realizaban en la época de la cosecha, "
        "por porcentaje o una cantidad predeterminada."
    )


def test_single_chapter_book_uses_explicit_book_not_guessed_chapter() -> None:
    source = snapshot("FILEMÓN 1-10\n1-3. " + "Historical context of the household. " * 10)
    source.books[0].id = "philemon"
    source.books[0].aliases = ["Filemom", "Philemon"]
    source.books[0].verseLimits[0].chapter = 1
    source.books[0].verseLimits[0].lastVerse = 25
    result = extract(source)
    assert result.notes
    assert all(
        n["passage"]["chapter"] == 1 and n["passage"]["bookId"] == "philemon" for n in result.notes
    )
    assert page_book("LUCAS 5\nIntroducción") is None


def test_unknown_book_invalid_verse_short_remission_and_changed_edition_are_refused() -> None:
    assert page_book("Prefacio\nDatos generales") is None
    assert not extract(snapshot("5:8. " + "Body without an explicit book. " * 10)).notes
    source = snapshot(
        "LUCAS 5:8-11\n5:99. " + "Body with invalid verse. " * 10 + "\n5:8. Véase Juan 1:1."
    )
    assert not extract(source).notes
    source.checksum = "a" * 64
    with pytest.raises(ValueError, match="checksum"):
        extract(source)


def test_new_book_heading_cannot_inherit_previous_book_and_reviewed_spans_are_preserved() -> None:
    source = snapshot("LUCAS 5:8-11\nJUAN\n5:8. " + "Different book body. " * 10)
    assert not extract(source).notes
    source = snapshot("LUCAS 5:8-11\n5:8. " + "Protected source body. " * 10)
    from app.commentary_extractor import Span

    source.protectedSpans = [Span(physicalPage=50, startOffset=0, endOffset=1000)]
    assert not extract(source).notes
