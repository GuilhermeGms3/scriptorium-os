"""Read-only PDF font evidence, cached by SHA-256; never changes source page text."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader
from pypdf.generic import DictionaryObject


def bold_markers(path: Path, expected_checksum: str) -> dict[int, list[str]]:
    with path.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    if checksum != expected_checksum:
        raise ValueError("Original PDF does not match workspace checksum")
    cache = path.with_suffix(".commentary-fonts-v2.json")
    if cache.exists():
        raw = json.loads(cache.read_bytes())
        if raw["checksum"] == checksum:
            return {int(key): list(value) for key, value in raw["pages"].items()}
    reader = PdfReader(path)
    result: dict[int, list[str]] = {}

    def page_prefixes(page_index: int) -> list[str]:
        prefixes: list[str] = []

        def visit(
            text: str, cm: list[float], tm: list[float], font: DictionaryObject | None, size: float
        ) -> None:
            if font and "bold" in str(font.get("/BaseFont", "")).casefold():
                value = re.sub(r"\s", "", text)
                if re.match(r"^\d{1,3}(?:[.:]\d{1,3}|\D|$)", value):
                    prefixes.append(value[:100])

        reader.pages[page_index].extract_text(visitor_text=visit)
        return prefixes

    for index in range(len(reader.pages)):
        result[index + 1] = page_prefixes(index)
    cache.write_text(json.dumps({"checksum": checksum, "pages": result}), encoding="utf-8")
    return result
