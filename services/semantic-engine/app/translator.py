from __future__ import annotations

import os
import re
import threading
from dataclasses import dataclass
from typing import Protocol

DEFAULT_MODEL = "Helsinki-NLP/opus-mt-tc-big-en-pt"


@dataclass(frozen=True)
class TranslationResult:
    translated_text: str
    provider: str
    model: str
    model_revision: str | None = None


class TranslationBackend(Protocol):
    def translate(self, text: str, source_language: str, target_language: str) -> TranslationResult: ...


def split_text(text: str, maximum_characters: int = 1_500) -> list[str]:
    """Divide sem reordenar parágrafos; o modelo ainda aplica sua própria tokenização."""
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    chunks: list[str] = []
    for paragraph in paragraphs:
        cursor = 0
        while cursor < len(paragraph):
            maximum = min(len(paragraph), cursor + maximum_characters)
            end = maximum
            if maximum < len(paragraph):
                candidates = [
                    paragraph.rfind(". ", cursor, maximum),
                    paragraph.rfind("; ", cursor, maximum),
                    paragraph.rfind(" ", cursor, maximum),
                ]
                boundary = max(candidates)
                if boundary > cursor + 300:
                    end = boundary + 1
            chunk = paragraph[cursor:end].strip()
            if chunk:
                chunks.append(chunk)
            cursor = max(end, cursor + 1)
    return chunks


class MarianTranslationBackend:
    """Backend lazy: nenhum modelo é carregado no build nem no processo web principal."""

    def __init__(self) -> None:
        self.model_name = os.getenv("SCRIPTORIUM_TRANSLATION_MODEL", DEFAULT_MODEL)
        self.model_revision = os.getenv("SCRIPTORIUM_TRANSLATION_MODEL_REVISION") or None
        self._tokenizer = None
        self._model = None
        self._lock = threading.Lock()

    def _load(self) -> tuple[object, object]:
        if self._tokenizer is not None and self._model is not None:
            return self._tokenizer, self._model
        with self._lock:
            if self._tokenizer is None or self._model is None:
                from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

                arguments = {
                    "revision": self.model_revision or "main",
                    "trust_remote_code": False,
                }
                self._tokenizer = AutoTokenizer.from_pretrained(self.model_name, **arguments)
                self._model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name, **arguments)
                self._model.eval()
        return self._tokenizer, self._model

    def translate(self, text: str, source_language: str, target_language: str) -> TranslationResult:
        if source_language.lower().split("-")[0] != "en":
            raise ValueError("Este backend aceita somente texto-fonte em inglês.")
        if target_language.lower().split("-")[0] != "pt":
            raise ValueError("Este backend aceita somente português como destino.")
        tokenizer, model = self._load()
        translations: list[str] = []
        for chunk in split_text(text):
            encoded = tokenizer(chunk, return_tensors="pt", truncation=True, max_length=512)
            generated = model.generate(**encoded, max_new_tokens=768, num_beams=4)
            translations.append(tokenizer.decode(generated[0], skip_special_tokens=True).strip())
        return TranslationResult(
            translated_text="\n\n".join(translations),
            provider="transformers-local",
            model=self.model_name,
            model_revision=self.model_revision,
        )

