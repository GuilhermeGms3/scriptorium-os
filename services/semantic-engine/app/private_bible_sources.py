"""Edition-pinned PDF geometry extraction. Stages private texts; never writes the workspace.

Only chapters with explicit book/chapter headings and an uninterrupted, bounded verse
sequence are offered to the reader. Incomplete or ambiguous chapters remain exceptions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

MULTI = "fcd9cc31bfde4b560ed23b0ff781a0ac23aa765bef3e3760c95aef970c637d4f"
NVI_AT = "57fb5954825baaea789c2e31417d050114fe73c9c88832166f29823a81ebe990"
NVI_NT = "5542cfaf98265dfa536806152c7fdbf0d59012fc6f1259ab24984e3cb71d519b"
ACF = "761b4abdb4c7fd544b290315f33b5f4851d05ebb87846cd658f3e9822a523f07"
LTT = "aa9f58a60004b40217c036edce246c8b6ff4c174eba9104af04d66e61a1c6f58"
TEB = "304675c0a56353c8c566f8d356b235de23882455f5680a4ea1c00202c7b35235"
AVE = "37cf074ee7a26a73a302fd3e274f057acb5da7ba45e4a1f065d1393e91297cc1"


def normalize(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text.casefold()) if not unicodedata.combining(c)
    ).strip()


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def spans(text: str, quality: str) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    cursor = 0
    for item in json.loads(quality).get("layout", []):
        value = str(item["text"]).strip()
        if not value:
            continue
        start = text.find(value, cursor)
        if start < 0:
            continue
        cursor = start + len(value)
        result.append(
            {
                "text": value,
                "start": start,
                "end": cursor,
                "x": item["transform"][4],
                "y": item["transform"][5],
                "size": item["height"],
            }
        )
    return result


def aliases(root: Path) -> tuple[dict[str, str], dict[tuple[str, int], int]]:
    base = root / "generated/corpora/biblia-livre/2025.1.0"
    manifest = json.loads((base / "manifest.json").read_text(encoding="utf-8"))
    names: dict[str, str] = {}
    limits: dict[tuple[str, int], int] = {}
    for book in manifest["books"]:
        for name in [book["name"], book["abbreviation"], book["id"]]:
            names[normalize(name)] = book["id"]
        for chapter, path in book["chapterFiles"].items():
            raw = json.loads((base / path).read_text(encoding="utf-8"))
            limits[(book["id"], int(chapter))] = max(
                v["ref"].get("verseEnd", v["verse"]) for v in raw["verses"]
            )
    labels = (root / "src/lib/i18n/index.ts").read_text(encoding="utf-8")
    ids = {b["id"] for b in manifest["books"]}
    for match in re.finditer(r'^\s*(?:"([a-z0-9-]+)"|([a-z0-9-]+)):\s*"([^"]+)"', labels, re.M):
        book_id = match[1] or match[2]
        if book_id in ids:
            names[normalize(match[3])] = book_id
            for roman, digit in [("III", "3"), ("II", "2"), ("I", "1")]:
                if match[3].startswith(digit + " "):
                    names[normalize(roman + match[3][1:])] = book_id
    names.update(
        {
            "cantares": "song-of-songs",
            "cantico dos canticos": "song-of-songs",
            "cantares de salomao": "song-of-songs",
            "salmo": "psalms",
            "jacobo": "james",
            "revelacao": "revelation",
        }
    )
    return names, limits


def chapter_heading(value: str, names: dict[str, str]) -> tuple[str, int] | None:
    match = re.fullmatch(r"(.+?)\s+(\d{1,3})", normalize(value))
    if match and match[1] in names:
        return names[match[1]], int(match[2])
    return None


def verses_from_geometry(
    pages: list[tuple[int, str, str]],
    checksum: str,
    column: int,
    names: dict[str, str],
    limits: dict[tuple[str, int], int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    groups: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
    book = ""
    chapter = 0
    current: dict[str, Any] | None = None
    for page, text, quality in pages:
        items = spans(text, quality)
        if checksum == MULTI:
            items = [
                i
                for i in items
                if 40 < i["y"] < 550 and 39 + 156 * column <= i["x"] < 39 + 156 * (column + 1)
            ]
        consumed: set[int] = set()
        for position, item in enumerate(items):
            if position in consumed:
                continue
            value, size = item["text"], item["size"]
            marker_rest: tuple[int, str] | None = None
            line = [item]
            for next_item in items[position + 1 : position + 12]:
                if abs(next_item["y"] - item["y"]) > 0.3 or abs(next_item["size"] - size) > 0.3:
                    break
                line.append(next_item)
            full_line = re.sub(r"\s+", " ", " ".join(i["text"] for i in line)).strip()
            heading = chapter_heading(full_line, names)
            if heading and size >= 9:
                book, chapter = heading
                current = None
                consumed.update(range(position + 1, position + len(line)))
                continue
            if checksum == MULTI:
                # Five fixed columns verified on this exact edition; headers/folios excluded.
                if not (
                    40 < item["y"] < 550
                    and 39 + 156 * column <= item["x"] < 39 + 156 * (column + 1)
                ):
                    continue
                heading = chapter_heading(value, names)
                if heading and size >= 9:
                    book, chapter = heading
                    current = None
                    continue
                marker = bool(re.fullmatch(r"\d{1,3}", value) and 6 <= size <= 7)
                body = 7.5 <= size <= 8.5
            elif checksum in {NVI_AT, NVI_NT}:
                if size >= 15 and normalize(full_line) in names:
                    book = names[normalize(full_line)]
                    chapter = 0
                    current = None
                    consumed.update(range(position + 1, position + len(line)))
                    continue
                match = re.fullmatch(r"Capítulo\s+(\d+)", full_line)
                if match and size >= 10:
                    chapter = int(match[1])
                    current = None
                    consumed.update(range(position + 1, position + len(line)))
                    continue
                marker = bool(re.fullmatch(r"\d{1,3}", value) and 6 <= size <= 7)
                body = 9.5 <= size <= 10.5
            elif checksum == LTT:
                if not 15 < item["y"] < 810:
                    continue
                prefix = re.match(r"^(\d{1,3})(?:\s+¶)?(?:\s+|$)", value)
                marker = bool(
                    prefix and 9.7 <= size <= 10.2 and (item["x"] < 56 or 318 <= item["x"] < 345)
                )
                if marker and prefix:
                    remainder = value[prefix.end() :].strip()
                    marker_rest = (
                        (item["start"] + value.index(remainder, prefix.end()), remainder)
                        if remainder
                        else None
                    )
                    value = prefix[1]
                body = 9.7 <= size <= 10.2
            else:
                # ACF carries explicit book/chapter in running headers and chapter labels.
                heading = chapter_heading(value, names)
                if heading and item["y"] > 680:
                    book, chapter = heading
                    current = None
                if normalize(value) in names and size >= 15:
                    book = names[normalize(value)]
                    chapter = 0
                    current = None
                match = re.fullmatch(r"Capítulo\s+(\d+)", value, re.I)
                if match:
                    chapter = int(match[1])
                    current = None
                    continue
                marker = bool(re.fullmatch(r"\d{1,3}", value) and size < 5)
                body = 8.5 <= size <= 13 and 65 < item["y"] < 715
            if not book or (book, chapter) not in limits:
                continue
            if marker:
                verse = int(value)
                current = {"bookId": book, "chapter": chapter, "verse": verse, "fragments": []}
                groups[(book, chapter)].append(current)
                if marker_rest:
                    start, quote = marker_rest
                    current["fragments"].append(
                        {
                            "physicalPage": page,
                            "quote": quote,
                            "start": start,
                            "end": start + len(quote),
                        }
                    )
            elif body and current:
                fragments = current["fragments"]
                start, end = item["start"], item["end"]
                if (
                    fragments
                    and fragments[-1]["physicalPage"] == page
                    and not text[fragments[-1]["end"] : start].strip()
                ):
                    previous = fragments[-1]
                    previous["end"] = end
                    previous["quote"] = text[previous["start"] : end]
                else:
                    fragments.append(
                        {"physicalPage": page, "quote": value, "start": start, "end": end}
                    )
    valid: list[dict[str, Any]] = []
    exceptions: list[dict[str, Any]] = []
    for (book_id, number), rows in groups.items():
        sequence = [r["verse"] for r in rows]
        if sequence != list(range(1, limits[(book_id, number)] + 1)) or any(
            not r["fragments"] for r in rows
        ):
            exceptions.append(
                {
                    "book": book_id,
                    "chapter": number,
                    "reason": "incomplete-or-ambiguous-verse-sequence",
                    "markers": len(sequence),
                }
            )
            continue
        for row in rows:
            row["text"] = " ".join(f["quote"] for f in row["fragments"])
            for fragment in row["fragments"]:
                source = pages[fragment["physicalPage"] - 1][1]
                fragment["startOffset"] = (
                    len(source[: fragment.pop("start")].encode("utf-16-le")) // 2
                )
                fragment["endOffset"] = len(source[: fragment.pop("end")].encode("utf-16-le")) // 2
            valid.append(row)
    return valid, exceptions


def build(workspace: Path, destination: Path, root: Path, checksums: tuple[str, ...] = ()) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    names, limits = aliases(root)
    definitions = [
        (MULTI, key, label, col)
        for col, (key, label) in enumerate(
            [
                ("ara", "ARA"),
                ("naa", "NAA"),
                ("bkj", "King James 1611 — português"),
                ("arib", "Almeida Revisada Imprensa Bíblica"),
                ("nbv", "Nova Bíblia Viva"),
            ]
        )
    ]
    definitions += [
        (NVI_AT, "nvi", "NVI", 0),
        (NVI_NT, "nvi", "NVI", 0),
        (ACF, "acf", "ACF", 0),
        (LTT, "ltt", "LTT — Texto Tradicional", 0),
    ]
    report = []
    with sqlite3.connect(workspace.resolve().as_uri() + "?mode=ro", uri=True) as db:
        for checksum, key, label, column in definitions:
            if checksums and checksum not in checksums:
                continue
            pages = [
                (int(i) + 1, str(t), str(q))
                for i, t, q in db.execute(
                    "SELECT page_index,text,quality_json FROM private_document_pages "
                    "WHERE document_id=? ORDER BY page_index",
                    ("private-document:" + checksum,),
                )
            ]
            if not pages:
                continue
            rows, exceptions = verses_from_geometry(pages, checksum, column, names, limits)
            edition_id = "private:" + key + "-pdf-20261101"
            units = []
            for index, row in enumerate(rows):
                units.append(
                    {
                        **row,
                        "id": "private-unit:"
                        + sha(checksum + key + json.dumps(row, ensure_ascii=False)),
                        "editionId": edition_id,
                        "documentChecksum": checksum,
                        "sequence": index,
                        "sourceScheme": "pdf:" + checksum + ":" + key,
                        "mapping": {
                            "targetScheme": "scriptorium-bcv-1",
                            "method": "explicit-heading-and-complete-chapter",
                            "review": "machine-proposed",
                        },
                    }
                )
            for i in range(0, len(units), 100):
                position = (
                    "LTT: Texto Tradicional/Textus Receptus e preservação verbal, "
                    "conforme prefácio de Hélio de Menezes Silva."
                    if key == "ltt"
                    else "Tradução da edição fornecida; extração automática e correspondência "
                    "de endereços pendentes de revisão."
                )
                output = {
                    "edition": {
                        "id": edition_id,
                        "title": label + " — acervo privado (extração em revisão)",
                        "abbreviation": label,
                        "language": "pt-BR",
                        "editorialPosition": position,
                    },
                    "units": units[i : i + 100],
                }
                (destination / f"{key}-{checksum[:8]}-{i // 100:04d}.json").write_text(
                    json.dumps(output, ensure_ascii=False), encoding="utf-8"
                )
            report.append(
                {
                    "key": key,
                    "checksum": checksum,
                    "units": len(units),
                    "chapters": len({(r["bookId"], r["chapter"]) for r in rows}),
                    "exceptions": exceptions,
                }
            )
    (destination / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps([{k: v for k, v in r.items() if k != "exceptions"} for r in report]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--checksums", default="")
    args = parser.parse_args()
    build(
        args.workspace, args.destination, args.root, tuple(filter(None, args.checksums.split(",")))
    )
