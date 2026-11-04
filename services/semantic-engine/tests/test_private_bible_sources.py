import json
from pathlib import Path

from app.annotated_bible_sources import ave_book_heading
from app.epub_text import epub_body_text
from app.private_bible_sources import MULTI, aliases, verses_from_geometry


def page(items: list[tuple[str, float, float]]) -> tuple[int, str, str]:
    text = "\n".join(t for t, _, _ in items)
    layout = [
        {"text": t, "height": size, "transform": [1, 0, 0, 1, x, 400]} for t, size, x in items
    ]
    return 1, text, json.dumps({"layout": layout})


def test_columns_and_utf16_evidence_are_preserved() -> None:
    p = page(
        [
            ("Genesis 1", 10, 45),
            ("1", 6.5, 45),
            ("😀 Primeira coluna", 8, 45),
            ("Genesis 1", 10, 210),
            ("1", 6.5, 210),
            ("Outra tradução", 8, 210),
            ("2", 6.5, 45),
            ("Segundo verso", 8, 45),
            ("2", 6.5, 210),
            ("Outra continuação", 8, 210),
        ]
    )
    rows, exceptions = verses_from_geometry(
        [p], MULTI, 0, {"genesis": "genesis"}, {("genesis", 1): 2}
    )
    assert not exceptions
    assert len(rows) == 2
    assert "Outra" not in rows[0]["text"]
    evidence = rows[0]["fragments"][0]
    encoded = p[1].encode("utf-16-le")
    assert (
        encoded[evidence["startOffset"] * 2 : evidence["endOffset"] * 2].decode("utf-16-le")
        == evidence["quote"]
    )


def test_ambiguous_chapter_is_not_silently_published() -> None:
    p = page([("Genesis 1", 10, 45), ("1", 6.5, 45), ("Um verso apenas", 8, 45)])
    rows, errors = verses_from_geometry([p], MULTI, 0, {"genesis": "genesis"}, {("genesis", 1): 2})
    assert not rows
    assert errors[0]["reason"] == "incomplete-or-ambiguous-verse-sequence"


def test_portuguese_names_use_existing_registry() -> None:
    names, limits = aliases(Path(__file__).resolve().parents[3])
    assert names["mateus"] == "matthew"
    assert names["exodo"] == "exodus"
    assert limits[("genesis", 1)] == 31


def test_ave_book_headers_do_not_inherit_previous_book() -> None:
    names = {"1 samuel": "1-samuel", "2 cronicas": "2-chronicles", "mateus": "matthew"}
    assert ave_book_heading("PRIMEIRO LIVRO DE SAMUEL", names) == "1-samuel"
    assert ave_book_heading("SEGUNDO LIVRO DAS CRÔNICAS", names) == "2-chronicles"
    assert ave_book_heading("EVANGELHO SEGUNDO SÃO MATEUS", names) == "matthew"
    assert ave_book_heading("LIVRO DE TOBIAS", names) == ""


def test_malformed_epub_is_inert_text_not_executable_html() -> None:
    result = epub_body_text(
        "<html><head><title>Ignore</title></head><body><p>Termo & texto malformado"
        '<p>Outro &amp; mais<script>fetch("secret")</script>'
        '<iframe src="http://example.com">Ignore</iframe></body>'
    )
    assert result == "Termo & texto malformado\nOutro & mais"
