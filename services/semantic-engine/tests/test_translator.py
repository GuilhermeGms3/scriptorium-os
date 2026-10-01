from app.translator import split_text


def test_split_text_preserves_order_and_bounds() -> None:
    text = "Primeiro parágrafo.\n\nSegundo parágrafo com conteúdo."
    assert split_text(text, maximum_characters=500) == [
        "Primeiro parágrafo.",
        "Segundo parágrafo com conteúdo.",
    ]


def test_split_text_breaks_large_content() -> None:
    chunks = split_text("palavra " * 600, maximum_characters=500)
    assert len(chunks) > 1
    assert all(len(chunk) <= 500 for chunk in chunks)

