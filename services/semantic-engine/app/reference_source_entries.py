"""Source-backed Anchor entries and Ave-Maria introductions/thematic appendices.

Page-local dictionary evidence is distinguished from complete entries. Explicit citations
are mention links, never inferred verse commentary or geographic coordinates.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from app.annotated_bible_sources import note, target, write_notes
from app.private_bible_sources import AVE, aliases, normalize, sha


def fragment(page: int, text: str, start: int, end: int) -> dict[str, Any]:
    return {
        "physicalPage": page,
        "pageTextChecksum": sha(text),
        "startOffset": len(text[:start].encode("utf-16-le")) // 2,
        "endOffset": len(text[:end].encode("utf-16-le")) // 2,
        "quote": text[start:end],
    }


def entry(
    page: int,
    text: str,
    start: int,
    end: int,
    label: str,
    author: str,
    tradition: str,
    topics: list[str],
    kind: str | None = None,
) -> dict[str, Any]:
    context: dict[str, Any] = {
        "topicIds": topics,
        "locator": label[:500],
        "sectionPath": [label[:300]],
        "role": "entry" if kind else "section",
        "author": author,
        "tradition": tradition,
        "rationale": "Cabeçalho ou seção documental identificado na edição fornecida; "
        "associação temática não constitui comentário de versículo.",
        "limitations": [
            "Recorte local à página, não verbete integral reconstruído.",
            "Texto extraído automaticamente; preservar original e conferir erros de OCR.",
        ],
    }
    if kind:
        context["referenceEntry"] = {
            "label": label[:150],
            "kind": kind,
            "language": "en",
            "extent": "page-local",
        }
    return {
        "domain": "geography" if kind == "place" else "historical-context" if kind else "tradition",
        "context": context,
        "fragments": [fragment(page, text, start, end)],
    }


def write_theme(destination: Path, checksum: str, entries: list[dict[str, Any]]) -> None:
    destination.mkdir(parents=True, exist_ok=False)
    files = []
    for i in range(0, len(entries), 80):
        raw = json.dumps(
            {
                "format": "scriptorium-thematic-readings-v1",
                "sourceChecksum": checksum,
                "entries": entries[i : i + 80],
            },
            ensure_ascii=False,
        )
        name = f"{checksum[:12]}-{i // 80:04d}.json"
        (destination / name).write_text(raw, encoding="utf-8")
        files.append({"file": name, "sha256": sha(raw)})
    (destination / "report.json").write_text(
        json.dumps(
            {"format": "scriptorium-thematic-report-v1", "entries": len(entries), "files": files},
            indent=2,
        ),
        encoding="utf-8",
    )


def build(workspace: Path, anchor: Path, output: Path, root: Path) -> None:
    doc = json.loads(anchor.read_text(encoding="utf-8"))
    checksum = doc["checksum"]
    names, limits = aliases(root)
    # English abbreviations actually used by this reference edition.
    names.update(
        {
            normalize(k): v
            for k, v in {
                "Gen": "genesis",
                "Exod": "exodus",
                "Num": "numbers",
                "Deut": "deuteronomy",
                "Josh": "joshua",
                "Judg": "judges",
                "1 Sam": "1-samuel",
                "2 Sam": "2-samuel",
                "1 Kgs": "1-kings",
                "2 Kgs": "2-kings",
                "1 Chr": "1-chronicles",
                "2 Chr": "2-chronicles",
                "Neh": "nehemiah",
                "Ps": "psalms",
                "Prov": "proverbs",
                "Isa": "isaiah",
                "Jer": "jeremiah",
                "Ezek": "ezekiel",
                "Matt": "matthew",
                "Rom": "romans",
                "1 Cor": "1-corinthians",
                "2 Cor": "2-corinthians",
                "Gal": "galatians",
                "Eph": "ephesians",
                "Phil": "philippians",
                "Col": "colossians",
                "Rev": "revelation",
            }.items()
        }
    )
    candidates = []
    links = []
    exceptions = []
    index_text = normalize(" ".join(p["text"] for p in doc["pages"][:109]))
    heading = re.compile(
        r"\b([A-Z][A-Z'’,-]*(?: [A-Z][A-Z'’,-]*){0,5})\s*\((PLACE|PERSON|DEITY|PEOPLE)\)\.?"
    )
    citation = re.compile(
        r"\b([1-3]?\s*[A-Za-z]{2,14})\.?\s+(\d{1,3}):(\d{1,3})(?:[–—-](\d{1,3}))?"
    )
    for p in doc["pages"][112:]:
        text = p["text"]
        page = p["pageIndex"] + 1
        marks = [
            m
            for m in heading.finditer(text)
            if not re.search(
                r"(?:[Ss]ee|[Cc]f\.|[Ss]ee also)\s*$", text[max(0, m.start() - 30) : m.start()]
            )
        ]
        for i, m in enumerate(marks):
            # OCR concatenates the preceding author's uppercase name with the next heading.
            # Resolve the longest suffix actually listed in this edition's article index.
            words = m[1].split()
            label_words = next(
                (
                    " ".join(words[j:])
                    for j in range(len(words))
                    if normalize(" ".join(words[j:]) + " (" + m[2] + ")") in index_text
                ),
                None,
            )
            if not label_words:
                exceptions.append(
                    {"page": page, "reason": "heading-not-confirmed-by-article-index"}
                )
                continue
            start = m.start() + m[1].rfind(label_words)
            end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
            if not 60 <= end - start <= 12000:
                continue
            label = label_words + " (" + m[2] + ")"
            kind = "place" if m[2] == "PLACE" else "person" if m[2] == "PERSON" else "concept"
            candidates.append(
                entry(
                    page,
                    text,
                    start,
                    end,
                    label,
                    "Autores dos verbetes; edição de David Noel Freedman",
                    "Obra acadêmica de referência; autoria individual a conferir",
                    [
                        "study-guide:historia-tradicoes",
                        "study-guide:literatura-fontes",
                        "topic:geography" if kind == "place" else "topic:historical-context",
                    ],
                    kind,
                )
            )
            quote = text[start:end]
            seen = set()
            for ref in citation.finditer(quote):
                book = names.get(normalize(ref[1]))
                chapter, first, last = int(ref[2]), int(ref[3]), int(ref[4] or ref[3])
                if (
                    not book
                    or book in {"psalms", "joel", "malachi", "esther", "daniel"}
                    or not 1 <= first <= last <= limits.get((book, chapter), 0)
                ):
                    continue
                key = (book, chapter, first, last)
                if key in seen:
                    continue
                seen.add(key)
                n = note(
                    checksum,
                    page,
                    quote,
                    target(book, chapter, first, last),
                    "Anchor · " + label,
                    "Autores dos verbetes; edição de David Noel Freedman",
                    "Obra acadêmica de referência",
                    "range" if first != last else "verse",
                )
                n.update(
                    referenceRole="lexical-mention",
                    relationType="cites",
                    domains=["geography" if kind == "place" else "historical-context"],
                )
                n["analysis"]["rationale"] = (
                    "Referência bíblica explícita dentro do verbete; é menção documental, "
                    "não prova de comentário da passagem."
                )
                n["analysis"]["sourceContext"]["kind"] = "biblical-handbook"
                links.append(n)
                if len(seen) == 10:
                    break
    write_theme(output / "anchor-themes", checksum, candidates)
    write_notes(output / "anchor-references", checksum, links, exceptions)
    themes = []
    with sqlite3.connect(workspace.resolve().as_uri() + "?mode=ro", uri=True) as db:
        for number, text in db.execute(
            "SELECT page_index+1,text FROM private_document_pages "
            "WHERE document_id=? ORDER BY page_index",
            ("private-document:" + AVE,),
        ):
            if not (27 <= number <= 84 or 2689 <= number <= 2807) or len(text.strip()) < 40:
                continue
            label = (
                "Introdução geral e aos livros"
                if number <= 84
                else "Índice doutrinal"
                if number <= 2720
                else "Material litúrgico e devocional"
            )
            for start in range(0, len(text), 8000):
                end = min(len(text), start + 8000)
                if end - start < 20:
                    continue
                themes.append(
                    entry(
                        number,
                        text,
                        start,
                        end,
                        "Ave-Maria · " + label,
                        "Equipe editorial da Bíblia Ave-Maria",
                        "Católica; introduções e apêndices da edição",
                        ["study-guide:historia-tradicoes", "study-guide:literatura-fontes"]
                        if number <= 84
                        else ["study-guide:teologia", "study-guide:eclesiologia-liturgia"],
                    )
                )
    write_theme(output / "ave-themes", AVE, themes)
    print(
        json.dumps(
            {
                "anchorEntries": len(candidates),
                "anchorMentions": len(links),
                "aveThematic": len(themes),
            }
        )
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("workspace", type=Path)
    p.add_argument("anchor", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[3])
    a = p.parse_args()
    build(a.workspace, a.anchor, a.output, a.root)
