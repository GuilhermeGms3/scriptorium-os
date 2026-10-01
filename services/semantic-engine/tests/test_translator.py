from app.translator import split_text, split_to_token_limit


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


class FakeTokenizer:
    def __call__(self, text: str, **_: object) -> dict[str, list[int]]:
        return {"input_ids": list(range(len(text.split()) + 2))}


def test_token_limit_splits_without_losing_words() -> None:
    text = " ".join(f"word-{index}" for index in range(120))
    chunks = split_to_token_limit(text, FakeTokenizer(), maximum_tokens=30)
    assert len(chunks) > 1
    assert all(len(FakeTokenizer()(chunk)["input_ids"]) <= 30 for chunk in chunks)
    assert " ".join(chunks).split() == text.split()

