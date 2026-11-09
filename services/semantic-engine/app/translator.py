from __future__ import annotations

import os
import re
import threading
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Protocol, cast

from pydantic import BaseModel

from .translation_glossary import load_glossary

DEFAULT_MODEL = "Helsinki-NLP/opus-mt-tc-big-en-pt"


class TokenizedText(BaseModel):
    input_ids: list[int] | list[list[int]]


@dataclass(frozen=True)
class TranslationResult:
    translated_text: str
    provider: str
    model: str
    model_revision: str | None = None


class TranslationBackend(Protocol):
    model_name: str
    model_revision: str | None

    @property
    def resolved_model_revision(self) -> str: ...

    @property
    def translation_revision(self) -> str: ...

    def translate(
        self, text: str, source_language: str, target_language: str
    ) -> TranslationResult: ...


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


class Tokenizer(Protocol):
    def __call__(self, text: str, **kwargs: object) -> Mapping[str, object]: ...
    def decode(self, tokens: object, *, skip_special_tokens: bool) -> str: ...


class GenerationModel(Protocol):
    def eval(self) -> object: ...
    def generate(self, **kwargs: object) -> Sequence[object]: ...


def split_to_token_limit(text: str, tokenizer: Tokenizer, maximum_tokens: int = 480) -> list[str]:
    """Divide novamente quando a tokenização excede a janela, sem truncar conteúdo."""
    pending = split_text(text, maximum_characters=1_200)
    result: list[str] = []
    while pending:
        chunk = pending.pop(0)
        encoded = tokenizer(chunk, add_special_tokens=True, truncation=False)
        input_ids = TokenizedText.model_validate(encoded).input_ids
        token_count = (
            len(input_ids[0]) if input_ids and isinstance(input_ids[0], list) else len(input_ids)
        )
        if token_count <= maximum_tokens:
            result.append(chunk)
            continue
        midpoint = len(chunk) // 2
        left_boundary = chunk.rfind(" ", 0, midpoint)
        right_boundary = chunk.find(" ", midpoint)
        boundary = left_boundary if left_boundary > len(chunk) // 3 else right_boundary
        if boundary <= 0 or boundary >= len(chunk):
            raise ValueError("Um trecho não pôde ser dividido sem truncamento de tokens.")
        pending[:0] = [chunk[:boundary].strip(), chunk[boundary:].strip()]
    return result


class MarianTranslationBackend:
    """Backend lazy: nenhum modelo é carregado no build nem no processo web principal."""

    def __init__(self) -> None:
        self.model_name = os.getenv("SCRIPTORIUM_TRANSLATION_MODEL", DEFAULT_MODEL)
        self.model_revision = os.getenv("SCRIPTORIUM_TRANSLATION_MODEL_REVISION") or None
        self._tokenizer: Tokenizer | None = None
        self._model: GenerationModel | None = None
        self._resolved_model_revision: str | None = None
        self._lock = threading.Lock()

    @property
    def resolved_model_revision(self) -> str:
        if self._resolved_model_revision is not None:
            return self._resolved_model_revision
        requested = self.model_revision or "main"
        if re.fullmatch(r"[0-9a-f]{40}", requested, flags=re.IGNORECASE):
            self._resolved_model_revision = requested.lower()
            return self._resolved_model_revision
        from huggingface_hub import HfApi

        information = HfApi().model_info(self.model_name, revision=requested)
        if not information.sha or not re.fullmatch(
            r"[0-9a-f]{40}", information.sha, flags=re.IGNORECASE
        ):
            raise RuntimeError("O repositório do modelo não informou um commit imutável.")
        self._resolved_model_revision = information.sha.lower()
        return self._resolved_model_revision

    @property
    def translation_revision(self) -> str:
        return f"{self.resolved_model_revision}:glossary:{load_glossary().fingerprint}"

    def _load(self) -> tuple[Tokenizer, GenerationModel]:
        if self._tokenizer is not None and self._model is not None:
            return self._tokenizer, self._model
        with self._lock:
            if self._tokenizer is None or self._model is None:
                from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

                # Dynamic factories implement these small runtime protocols; no model is loaded
                # by imports, /health or the deterministic analyzer.
                tokenizer_factory = cast(Callable[..., Tokenizer], AutoTokenizer.from_pretrained)
                model_factory = cast(
                    Callable[..., GenerationModel], AutoModelForSeq2SeqLM.from_pretrained
                )
                self._tokenizer = tokenizer_factory(
                    self.model_name, revision=self.resolved_model_revision, trust_remote_code=False
                )
                self._model = model_factory(
                    self.model_name, revision=self.resolved_model_revision, trust_remote_code=False
                )
                self._model.eval()
        return self._tokenizer, self._model

    def translate(self, text: str, source_language: str, target_language: str) -> TranslationResult:
        if source_language.lower().split("-")[0] != "en":
            raise ValueError("Este backend aceita somente texto-fonte em inglês.")
        if target_language.lower().split("-")[0] != "pt":
            raise ValueError("Este backend aceita somente português como destino.")
        tokenizer, model = self._load()
        glossary = load_glossary()
        protected, substitutions = glossary.protect(text)

        def translate_chunks(value: str) -> str:
            translations: list[str] = []
            for chunk in split_to_token_limit(value, tokenizer):
                encoded = tokenizer(chunk, return_tensors="pt", truncation=False)
                generated = model.generate(**encoded, max_new_tokens=768, num_beams=4)
                translations.append(
                    tokenizer.decode(generated[0], skip_special_tokens=True).strip()
                )
            return "\n\n".join(translations)

        translated = translate_chunks(protected)
        try:
            translated = glossary.restore(translated, substitutions)
        except ValueError:
            # Some Marian tokenizers alter placeholders. Preserve protected terms literally and
            # translate surrounding segments instead of silently dropping them or breaking reading.
            segments: list[str] = []
            for part in re.split(r"(ZXQTERM\d{5}QXZ)", protected):
                if part in substitutions:
                    segments.append(substitutions[part])
                elif part.strip():
                    leading = part[: len(part) - len(part.lstrip())]
                    trailing = part[len(part.rstrip()) :]
                    segments.append(leading + translate_chunks(part.strip()) + trailing)
                else:
                    segments.append(part)
            translated = "".join(segments)
        return TranslationResult(
            translated_text=translated,
            provider="transformers-local",
            model=self.model_name,
            model_revision=f"{self.resolved_model_revision}:glossary:{glossary.fingerprint}",
        )
