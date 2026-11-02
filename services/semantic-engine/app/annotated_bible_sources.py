"""Calibrated source notes and introductions, with exact private page evidence.

References in prose never select the destination. TEB's first sample uses a curated
page/marker map; LTT uses the note's leading reference; Ave-Maria uses book-end notes.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.private_bible_sources import AVE, LTT, TEB, aliases, normalize, sha, spans


def ave_book_heading(value: str, names: dict[str, str]) -> str:
    text = normalize(value).split(" ou ")[0]
    text = re.sub(r"^evangelho segundo sao\s+", "", text)
    for word, digit in [
        ("primeiro", "1"),
        ("primeira", "1"),
        ("segundo", "2"),
        ("segunda", "2"),
        ("terceira", "3"),
    ]:
        text = re.sub(r"^" + word + r"\s+", digit + " ", text)
    text = re.sub(r"\b(?:livro|carta|de|do|dos|das|aos|ao|a|sao|paulo)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return names.get(
        text,
        {
            "habacuc": "habakkuk",
            "abdias": "obadiah",
            "filemon": "philemon",
            "atos apostolos": "acts",
        }.get(text, ""),
    )


def target(
    book: str, chapter: int, first: int | None = None, last: int | None = None
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "bookId": book,
        "workId": "work:" + book,
        "chapter": chapter,
        "versificationSchemeId": "scriptorium-bcv-1",
    }
    if first is not None:
        result.update(verseStart=first, verseEnd=last or first)
    return result


def note(
    checksum: str,
    page: int,
    quote: str,
    passage: dict[str, Any],
    label: str,
    author: str,
    tradition: str,
    scope: str = "verse",
) -> dict[str, Any]:
    return {
        "sourceChecksum": checksum,
        "fragments": [{"physicalPage": page, "quote": quote}],
        "rawReference": label[:200],
        "passage": passage,
        "additionalPassages": [],
        "relationScope": scope,
        "relationType": "discusses",
        "domains": ["exegesis"],
        "analysis": {
            "title": label[:200],
            "summary": quote,
            "mode": "source-excerpt",
            "rationale": "Destino identificado no cabeçalho da nota ou em mapa documental "
            "calibrado; remissões internas permanecem secundárias.",
            "contentType": "source-commentary",
            "sourceContext": {
                "kind": "intertextual-commentary",
                "locator": label[:300],
                "sectionPath": [label[:300]],
                "authorLabel": author,
                "traditionLabel": tradition,
            },
            "limitations": [
                "Trecho literal da edição privada, associação automática pendente de auditoria; "
                "não é consenso teológico.",
                "Recorte local à página; a fonte pode continuar sua explicação em outras páginas.",
            ],
        },
    }


def write_notes(
    destination: Path, checksum: str, notes: list[dict[str, Any]], exceptions: list[dict[str, Any]]
) -> None:
    destination.mkdir(parents=True, exist_ok=False)
    files = []
    for start in range(0, len(notes), 80):
        identifier = "annotated-" + sha(checksum + str(start))[:24]
        raw = json.dumps(
            {
                "format": "scriptorium-contextual-reading-v1",
                "batchId": identifier,
                "analyst": "deterministic-annotated-bibles-v1",
                "createdAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
                "coverage": "Notas com destinos documentais explícitos; separadas do texto bíblico "
                "e de referências secundárias, sem inferência LLM.",
                "notes": notes[start : start + 80],
            },
            ensure_ascii=False,
        )
        name = f"{start // 80:04d}-{identifier}.json"
        (destination / name).write_text(raw, encoding="utf-8")
        files.append({"file": name, "sha256": sha(raw)})
    (destination / "report.json").write_text(
        json.dumps(
            {
                "format": "scriptorium-commentary-report-v1",
                "structureResolved": True,
                "sourceType": "source-context",
                "sourceChecksum": checksum,
                "files": files,
                "extractedNotes": len(notes),
                "exceptions": exceptions,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def build(workspace: Path, destination: Path, root: Path) -> None:
    names, limits = aliases(root)
    with sqlite3.connect(workspace.resolve().as_uri() + "?mode=ro", uri=True) as db:
        for checksum in [TEB, LTT, AVE]:
            notes: list[dict[str, Any]] = []
            exceptions: list[dict[str, Any]] = []
            current_book = ""
            pages = list(
                db.execute(
                    "SELECT page_index+1,text,quality_json FROM private_document_pages "
                    "WHERE document_id=? ORDER BY page_index",
                    ("private-document:" + checksum,),
                )
            )
            for physical, text, quality in pages:
                if checksum == TEB:
                    # First calibrated page: note letters are read in two columns below Scripture.
                    if physical != 50:
                        continue
                    mapping = {
                        "a": (1, 1, 31),
                        "b": (1, 1, 1),
                        "d": (1, 2, 2),
                        "e": (1, 2, 2),
                        "f": (1, 3, 3),
                        "g": (1, 3, 3),
                        "h": (1, 5, 5),
                        "i": (1, 6, 6),
                        "k": (1, 9, 9),
                    }
                    marks = list(re.finditer(r"(?m)^([a-z])\.\s*", text))
                    for index, match in enumerate(marks):
                        if match[1] not in mapping:
                            continue
                        end = marks[index + 1].start() if index + 1 < len(marks) else len(text)
                        # Lost OCR labels (c,j,l) must terminate previous notes as well.
                        region = text[match.start() : end]
                        lost = re.search(r"(?m)^[cCjJI]\.\s", region[3:])
                        if lost:
                            region = region[: 3 + lost.start()]
                        if len(region.strip()) < 20:
                            continue
                        chapter, first, last = mapping[match[1]]
                        n = note(
                            checksum,
                            physical,
                            region.strip(),
                            target("genesis", chapter, first, last),
                            "TEB · Gênesis 1 · nota " + match[1],
                            "Equipe da Tradução Ecumênica da Bíblia",
                            "Edição ecumênica; posições dos autores",
                            "pericope" if first != last else "verse",
                        )
                        if match[1] == "a":
                            n["additionalPassages"] = [target("genesis", 2, 1, 4)]
                        notes.append(n)
                    continue
                if checksum == LTT:
                    matches = list(
                        re.finditer(
                            r"(?m)^\d{1,5}\s+([1-3]?\s*[A-Za-zÀ-ÿ]+)\s*(\d{1,3}):(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?",
                            text,
                        )
                    )
                    for i, m in enumerate(matches):
                        book = names.get(normalize(m[1]))
                        chapter, first, last = int(m[2]), int(m[3]), int(m[4] or m[3])
                        if not book or not (1 <= first <= last <= limits.get((book, chapter), 0)):
                            exceptions.append(
                                {
                                    "page": physical,
                                    "reference": m[0],
                                    "reason": "unknown-or-out-of-bounds-primary-reference",
                                }
                            )
                            continue
                        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
                        quote = text[m.start() : end].strip()
                        if not 20 <= len(quote) <= 12000:
                            exceptions.append({"page": physical, "reason": "note-size"})
                            continue
                        notes.append(
                            note(
                                checksum,
                                physical,
                                quote,
                                target(book, chapter, first, last),
                                "LTT · " + m[0],
                                "Hélio de Menezes Silva",
                                "Posição editorial da LTT: Texto Tradicional/Textus Receptus "
                                "e preservação verbal",
                                "range" if first != last else "verse",
                            )
                        )
                    continue
                # Ave-Maria: notes follow each book, not beneath every page's biblical verses.
                if physical < 85 or physical >= 2689:
                    continue
                large = [
                    item["text"]
                    for item in spans(text, quality)
                    if 28 <= item["size"] <= 32 and not item["text"].isdigit()
                ]
                if large:
                    current_book = ave_book_heading(" ".join(large), names)
                matches = list(
                    re.finditer(r"(?m)^(\d{1,3}),(\d{1,3})(?:[-–](\d{1,3}))?\.\s+", text)
                )
                for i, m in enumerate(matches):
                    chapter, first, last = int(m[1]), int(m[2]), int(m[3] or m[2])
                    if current_book in {"psalms", "joel", "malachi", "daniel", "esther"} or not (
                        1 <= first <= last <= limits.get((current_book, chapter), 0)
                    ):
                        exceptions.append(
                            {
                                "page": physical,
                                "reason": "versification-or-book-context-requires-review",
                            }
                        )
                        continue
                    quote = text[
                        m.start() : matches[i + 1].start() if i + 1 < len(matches) else len(text)
                    ].strip()
                    if 20 <= len(quote) <= 12000:
                        notes.append(
                            note(
                                checksum,
                                physical,
                                quote,
                                target(current_book, chapter, first, last),
                                f"Ave-Maria · {current_book} {chapter}:{first}",
                                "Equipe editorial da Bíblia Ave-Maria",
                                "Católica; comentário da edição fornecida",
                                "range" if first != last else "verse",
                            )
                        )
            write_notes(destination / checksum[:12], checksum, notes, exceptions)
            print(
                json.dumps(
                    {"checksum": checksum, "notes": len(notes), "exceptions": len(exceptions)}
                )
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[3])
    a = parser.parse_args()
    build(a.workspace, a.destination, a.root)
