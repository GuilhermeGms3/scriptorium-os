from pytest import MonkeyPatch

from app.translator import MarianTranslationBackend, split_text, split_to_token_limit


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


def test_explicit_commit_revision_is_preserved_without_branch_alias(
    monkeypatch: MonkeyPatch,
) -> None:
    revision = "0123456789abcdef0123456789abcdef01234567"
    monkeypatch.setenv("SCRIPTORIUM_TRANSLATION_MODEL_REVISION", revision)
    backend = MarianTranslationBackend()
    assert backend.resolved_model_revision == revision


def test_translation_revision_tracks_glossary_and_output_preserves_terms(monkeypatch):
    monkeypatch.setenv("SCRIPTORIUM_TRANSLATION_MODEL_REVISION", "a" * 40)
    backend = MarianTranslationBackend()

    class Tokenizer:
        def __call__(self, text, **kwargs):
            return {"input_ids": list(range(len(text.split()))), "text": text}

        def decode(self, tokens, **kwargs):
            return tokens

    class Model:
        def generate(self, **kwargs):
            return [kwargs["text"]]

    monkeypatch.setattr(backend, "_load", lambda: (Tokenizer(), Model()))
    result = backend.translate("LORD and Torah", "en", "pt")
    assert result.translated_text == "SENHOR and Torá"
    assert result.model_revision == backend.translation_revision
    assert ":glossary:" in backend.translation_revision


def test_damaged_placeholders_use_literal_segment_fallback(monkeypatch):
    monkeypatch.setenv("SCRIPTORIUM_TRANSLATION_MODEL_REVISION", "a" * 40)
    backend = MarianTranslationBackend()

    class Tokenizer:
        def __call__(self, text, **kwargs):
            return {"input_ids": list(range(len(text.split()))), "text": text}

        def decode(self, tokens, **kwargs):
            return tokens

    class Model:
        def generate(self, **kwargs):
            return ["broken placeholder" if "ZXQTERM" in kwargs["text"] else kwargs["text"]]

    monkeypatch.setattr(backend, "_load", lambda: (Tokenizer(), Model()))
    assert (
        backend.translate("The LORD protects Torah.", "en", "pt").translated_text
        == "The SENHOR protects Torá."
    )
