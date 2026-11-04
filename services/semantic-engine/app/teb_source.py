"""Whole-edition TEB apparatus extraction, separate from biblical body and margins.

Chapter associations are deterministic textual proposals, not a verified crosswalk.
All pages and unresolved notes are accounted for; no page-50 sampling limit.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Any

from app.annotated_bible_sources import note, target, write_notes
from app.private_bible_sources import TEB, normalize, sha, spans
from app.reference_source_entries import entry, write_theme

# Physical starts calibrated against this edition's own headings and contents.
# Printed-to-physical offset changes inside this PDF; never apply one global offset.
STARTS = [
    (50, "genesis"),
    (126, "exodus"),
    (186, "leviticus"),
    (230, "numbers"),
    (295, "deuteronomy"),
    (352, "joshua"),
    (388, "judges"),
    (431, "1-samuel"),
    (477, "2-samuel"),
    (524, "1-kings"),
    (568, "2-kings"),
    (626, "isaiah"),
    (739, "jeremiah"),
    (833, "ezekiel"),
    (906, "hosea"),
    (924, "joel"),
    (934, "amos"),
    (948, "obadiah"),
    (953, "jonah"),
    (959, "micah"),
    (971, "nahum"),
    (981, "habakkuk"),
    (989, "zephaniah"),
    (996, "haggai"),
    (1003, "zechariah"),
    (1020, "malachi"),
    (1036, "psalms"),
    (1198, "job"),
    (1256, "proverbs"),
    (1312, "ruth"),
    (1321, "song-of-songs"),
    (1337, "ecclesiastes"),
    (1353, "lamentations"),
    (1371, "esther"),
    (1389, "daniel"),
    (1430, "ezra"),
    (1446, "nehemiah"),
    (1470, "1-chronicles"),
    (1511, "2-chronicles"),
    (1567, "esther-greek"),
    (1589, "judith"),
    (1611, "tobit"),
    (1633, "1-maccabees"),
    (1675, "2-maccabees"),
    (1711, "wisdom"),
    (1743, "sirach"),
    (1844, "baruch"),
    (1855, "letter-jeremiah"),
    (1882, "matthew"),
    (1945, "mark"),
    (1988, "luke"),
    (2066, "john"),
    (2124, "acts"),
    (2192, "romans"),
    (2228, "1-corinthians"),
    (2255, "2-corinthians"),
    (2275, "galatians"),
    (2288, "ephesians"),
    (2302, "philippians"),
    (2314, "colossians"),
    (2328, "1-thessalonians"),
    (2335, "2-thessalonians"),
    (2345, "1-timothy"),
    (2352, "2-timothy"),
    (2356, "titus"),
    (2361, "philemon"),
    (2370, "hebrews"),
    (2392, "james"),
    (2406, "1-peter"),
    (2416, "2-peter"),
    (2423, "1-john"),
    (2430, "2-john"),
    (2432, "3-john"),
    (2435, "jude"),
    (2442, "revelation"),
]


def grams(text: str) -> set[str]:
    compact = re.sub(r"[^a-z]", "", normalize(text))
    return {compact[i : i + 4] for i in range(max(0, len(compact) - 3))}


def match_chapter(body: str, chapters: dict[int, set[str]]) -> tuple[int, float] | None:
    query = grams(body)
    if len(query) < 80:
        return None
    scores = sorted(
        (
            (len(query & words) / math.sqrt(len(query) * max(1, len(words))), chapter)
            for chapter, words in chapters.items()
        ),
        reverse=True,
    )
    if not scores or scores[0][0] < 0.20:
        return None
    if len(scores) > 1 and scores[0][0] < scores[1][0] * 1.18:
        return None
    return scores[0][1], round(scores[0][0], 4)


def match_marker_verse(
    marker: str, body: str, verses: dict[int, str], note_text: str
) -> int | None:
    """Require an attached non-morphological OCR note letter plus local verse overlap."""
    if marker.lower() not in "bcdfghjkpqtvwxyz":
        return None
    text = normalize(body)
    vocabulary = set(re.findall(r"[a-z]+", normalize(" ".join(verses.values()))))
    note_vocabulary = set(re.findall(r"[a-z]+", normalize(note_text)))
    matches: set[int] = set()
    for token in re.finditer(r"\b([a-z]{4,})" + re.escape(marker.lower()) + r"\b", text):
        if (
            token[0] in vocabulary
            or token[1] not in vocabulary
            or token[1] not in note_vocabulary
            or len(token[1]) < 5
            or token[1] in {"senhor", "homem", "terra", "disse", "todos", "assim"}
        ):
            continue
        nearby = grams(text[max(0, token.start() - 90) : token.end() + 90])
        ranked = sorted(
            (len(nearby & grams(v)), n)
            for n, v in verses.items()
            if token[1] in re.findall(r"[a-z]+", normalize(v))
        )
        if len(ranked) != 1 or ranked[-1][0] < 25:
            continue
        if len(ranked) > 1 and ranked[-1][0] < ranked[-2][0] * 1.3:
            continue
        matches.add(ranked[-1][1])
    return next(iter(matches)) if len(matches) == 1 else None


def page_parts(text: str, quality: str) -> tuple[str, list[dict[str, Any]]]:
    """Read columns independently; a footnote never swallows right-column Scripture."""
    items = spans(text, quality)
    columns: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        if item["size"] <= 0:
            continue
        columns[0 if item["x"] < 198 else 1].append(item)
    body: list[str] = []
    regions: list[dict[str, Any]] = []
    for column, rows in sorted(columns.items()):
        lines: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for item in rows:
            lines[round(item["y"] * 2)].append(item)
        ordered = [
            sorted(values, key=lambda x: x["x"])
            for _, values in sorted(lines.items(), reverse=True)
        ]
        floor = 198 if column else 0
        anchors: list[tuple[float, int, str]] = []
        for line in ordered:
            first = line[0]
            words = text[first["start"] : max(x["end"] for x in line)]
            marker = re.match(r"^([a-zA-Z])\s*[.)]\s*", words)
            small = sum(len(x["text"]) for x in line if 5.0 <= x["size"] <= 6.8)
            if (
                marker
                and floor + (5 if column else 10) <= first["x"] <= floor + 32
                and small >= max(1, sum(len(x["text"]) for x in line) * 0.45)
            ):
                anchors.append((first["y"], first["start"], marker[1]))
        cut = max((a[0] for a in anchors), default=-1)
        eligible = [x for x in rows if x["y"] <= cut + 0.5]
        body.extend(
            x["text"]
            for x in rows
            if x["y"] > cut + 0.5
            and 7.2 <= x["size"] <= 10
            and (x["x"] >= 40 if column == 0 else x["x"] < 353)
        )
        for index, (y, start, anchor_marker) in enumerate(anchors):
            end = (
                anchors[index + 1][1]
                if index + 1 < len(anchors)
                else max((x["end"] for x in eligible), default=start)
            )
            # PDF text items are normally column-ordered. Reject interleaved layouts.
            if end <= start or any(
                x["start"] >= start and x["end"] <= end and x["y"] > y + 1 for x in rows
            ):
                continue
            quote = text[start:end].strip()
            if 20 <= len(quote) <= 12000:
                regions.append(
                    {
                        "start": start,
                        "end": start + len(quote),
                        "quote": quote,
                        "marker": anchor_marker,
                    }
                )
    return " ".join(body), regions


def attach_corrections(db: sqlite3.Connection, notes: list[dict[str, Any]]) -> int:
    """Use the canonical supersession contract; preserve evidence and human decisions."""
    existing: dict[str, list[tuple[str, str, str, str]]] = defaultdict(list)
    for identifier, raw, review, audit in db.execute(
        "SELECT p.id,p.payload_json,p.review_status,d.audit_status FROM knowledge_proposals p "
        "JOIN pipeline_decisions d ON d.proposal_id=p.id WHERE p.document_id=? "
        "AND p.proposal_kind='passage-relation' AND d.publication='machine-visible'",
        ("private-document:" + TEB,),
    ):
        existing[json.loads(raw)["rawReference"]].append((identifier, raw, review, audit))
    corrections = 0
    for n in notes:
        candidates = existing.get(n["rawReference"], [])
        if len(candidates) != 1:
            continue
        identifier, raw, review, audit = candidates[0]
        old = json.loads(raw)
        if (
            old["passage"] == n["passage"]
            and old["relationScope"] == n["relationScope"]
            and old["contextualAnalysis"]["summary"] == n["analysis"]["summary"]
        ):
            n["analysis"] = old["contextualAnalysis"]
            continue
        if review != "machine-proposed" or audit != "pending":
            raise ValueError("Calibração encontrou revisão humana; requer exceção explícita.")
        n["supersedes"] = {
            "proposalId": identifier,
            "payloadChecksum": sha(raw),
            "reason": "Recalibração da segmentação do aparato e do alcance documental; "
            "evidência anterior preservada e proposta automática anterior retirada.",
        }
        corrections += 1
    return corrections


def build(workspace: Path, reference: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    chapters_text: dict[str, dict[int, str]] = defaultdict(dict)
    verse_text: dict[tuple[str, int], dict[int, str]] = defaultdict(dict)
    with sqlite3.connect(reference.resolve().as_uri() + "?mode=ro", uri=True) as ref:
        for book, chapter, text in ref.execute(
            "SELECT a.book_id,a.chapter,group_concat(t.surface_text,' ') FROM text_units t "
            "JOIN text_addresses a ON a.text_unit_id=t.id GROUP BY a.book_id,a.chapter"
        ):
            chapters_text[book][chapter] = text
        for book, chapter, verse, text in ref.execute(
            "SELECT a.book_id,a.chapter,a.verse_start,t.surface_text FROM text_units t "
            "JOIN text_addresses a ON a.text_unit_id=t.id"
        ):
            verse_text[(book, chapter)][verse] = text
    chapter_index = {b: {c: grams(t) for c, t in rows.items()} for b, rows in chapters_text.items()}
    published: list[dict[str, Any]] = []
    themes: list[dict[str, Any]] = []
    report: list[dict[str, Any]] = []
    introduction = False
    with sqlite3.connect(workspace.resolve().as_uri() + "?mode=ro", uri=True) as db:
        for page, text, quality in db.execute(
            "SELECT page_index+1,text,quality_json FROM private_document_pages "
            "WHERE document_id=? ORDER BY page_index",
            ("private-document:" + TEB,),
        ):
            body, notes = page_parts(text, quality)
            if page in {p for p, _ in STARTS}:
                introduction = False
            heading = "".join(x["text"] for x in spans(text, quality) if x["size"] >= 11)[:250]
            if "introducao" in re.sub(r"[^a-z]", "", normalize(heading)):
                introduction = True
            book = next((b for p, b in reversed(STARTS) if p <= page), "") if page < 2466 else ""
            matched = (
                match_chapter(body, chapter_index.get(book, {}))
                if book and not introduction
                else None
            )
            state = {
                "page": page,
                "textCharacters": len(text),
                "notes": len(notes),
                "book": book,
                "chapterMatch": matched,
            }
            report.append(state)
            for region in notes:
                label = f"TEB · {book or 'aparato'} · p. {page} · nota {region['marker']}"
                # Always preserve the extracted note as a source-backed study reading.
                reading = entry(
                    page,
                    text,
                    region["start"],
                    region["end"],
                    label,
                    "Equipe da Tradução Ecumênica da Bíblia",
                    "Ecumênica; posição da edição",
                    ["study-guide:literatura-fontes", "study-guide:hermeneutica"],
                )
                reading["context"]["limitations"].append(
                    "Recorte de OCR; destino por alinhamento textual é inferido, "
                    "não conferido por pessoa."
                )
                themes.append(reading)
                if not matched or page == 50:
                    continue  # Existing manually calibrated page-50 associations are preserved.
                chapter, score = matched
                verse = match_marker_verse(
                    region["marker"], body, verse_text[(book, chapter)], region["quote"]
                )
                # Source-specific corrections from inspection of the recovered apparatus.
                # These remain assistant-reviewed proposals, never human-reviewed decisions.
                if (page, region["marker"]) == (1990, "f") and chapter == 1:
                    verse = 32  # "Jesus é grande" belongs to Lk 1:32, not the preceding 1:31.
                if (page, region["marker"]) == (116, "d"):
                    verse = None  # Paragraph scope: do not narrow Gen 47 to a single verse.
                n = note(
                    TEB,
                    page,
                    region["quote"],
                    target(book, chapter, verse),
                    label,
                    "Equipe da Tradução Ecumênica da Bíblia",
                    "Ecumênica; posição da edição",
                    "verse" if verse else "chapter",
                )
                n["analysis"]["rationale"] = (
                    f"Contexto de capítulo inferido exclusivamente do corpo bíblico da página, "
                    f"por sobreposição de tetragramas com a Bíblia Livre (escore {score}); "
                    "não usa referências internas da nota como destino."
                )
                n["analysis"]["limitations"].append(
                    "Alcance inferido a conferir no PDF; "
                    "não equivale a comentário individual de todos os versículos."
                )
                if verse:
                    n["analysis"]["rationale"] += (
                        " Marcador de nota anexado ao corpo bíblico, com correspondência "
                        "lexical local única ao versículo; associação ainda inferida e revisável."
                    )
                published.append(n)
            if page % 200 == 0:
                print(
                    json.dumps(
                        {"page": page, "notes": len(themes), "chapterContexts": len(published)}
                    ),
                    flush=True,
                )
    with sqlite3.connect(workspace.resolve().as_uri() + "?mode=ro", uri=True) as db:
        corrections = attach_corrections(db, published)
    write_notes(
        output / "contextual",
        TEB,
        published,
        [r for r in report if r["notes"] and not r["chapterMatch"]],
    )
    write_theme(output / "thematic", TEB, themes)
    (output / "coverage.json").write_text(
        json.dumps(
            {
                "sourceChecksum": TEB,
                "pagesScanned": len(report),
                "notesExtracted": len(themes),
                "publishedContextualNotes": len(published),
                "chapterContexts": sum(n["relationScope"] == "chapter" for n in published),
                "pages": report,
                "unresolvedNotes": sum(r["notes"] for r in report if not r["chapterMatch"]),
                "referencePolicy": "Inferred context; not human-reviewed verse assignments.",
                "verseAssociations": sum(n["relationScope"] == "verse" for n in published),
                "supersededAutomaticCandidates": corrections,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("reference", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.workspace, args.reference, args.output)
