"""Explicit case-sensitive terminology, with checked roundtrip and content-addressed revision."""

from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Rule(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(min_length=1, max_length=100)
    target: str = Field(min_length=1, max_length=100)


class Glossary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: str = Field(min_length=1, max_length=100)
    rules: list[Rule] = Field(max_length=200)

    @model_validator(mode="after")
    def unique_sources(self) -> Glossary:
        if len({rule.source for rule in self.rules}) != len(self.rules):
            raise ValueError("Termos duplicados no glossário.")
        return self

    @property
    def fingerprint(self) -> str:
        return hashlib.sha256(self.model_dump_json().encode()).hexdigest()

    def protect(self, text: str) -> tuple[str, dict[str, str]]:
        if "ZXQTERM" in text:
            raise ValueError("Texto contém marcador reservado do glossário.")
        substitutions: dict[str, str] = {}
        targets = {rule.source: rule.target for rule in self.rules}
        if not targets:
            return text, substitutions
        pattern = (
            r"(?<!\w)(?:"
            + "|".join(re.escape(s) for s in sorted(targets, key=len, reverse=True))
            + r")(?!\w)"
        )

        def replace(match: re.Match[str]) -> str:
            marker = f"ZXQTERM{len(substitutions):05d}QXZ"
            substitutions[marker] = targets[match.group()]
            return marker

        return re.sub(pattern, replace, text), substitutions

    @staticmethod
    def restore(text: str, substitutions: dict[str, str]) -> str:
        found = re.findall(r"ZXQTERM\d{5}QXZ", text)
        if sorted(found) != sorted(substitutions) or any(
            text.count(marker) != 1 for marker in substitutions
        ):
            raise ValueError("O tradutor alterou/omitiu um termo protegido; mantenha o original.")
        for marker, target in substitutions.items():
            text = text.replace(marker, target)
        if "ZXQTERM" in text:
            raise ValueError("Marcador de tradução inválido.")
        return text


def load_glossary() -> Glossary:
    path = Path(
        os.getenv(
            "SCRIPTORIUM_TRANSLATION_GLOSSARY",
            str(Path(__file__).with_name("theological-glossary.json")),
        )
    )
    if path.stat().st_size > 256 * 1024:
        raise ValueError("Glossário excede 256 KiB.")
    return Glossary.model_validate_json(path.read_bytes())
