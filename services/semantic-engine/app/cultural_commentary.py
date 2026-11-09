"""Edition-pinned Keener notes: running book + primary lemma, never prose mentions."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from .commentary_extractor import Extraction, Snapshot, normalize
from .outlined_sources import targets
from .source_context import publish_staging

CHECKSUM = "7908244b4c9208b2c75e4dd43d51c9d44f906b78568aecdb54cb9d7583955eec"
BOOKS = {
    "mateo": "matthew",
    "marcos": "mark",
    "lucas": "luke",
    "juan": "john",
    "hechos": "acts",
    "romanos": "romans",
    "1 corintios": "1-corinthians",
    "2 corintios": "2-corinthians",
    "galatas": "galatians",
    "efesios": "ephesians",
    "filipenses": "philippians",
    "colosenses": "colossians",
    "1 tesalonicenses": "1-thessalonians",
    "2 tesalonicenses": "2-thessalonians",
    "1 timoteo": "1-timothy",
    "2 timoteo": "2-timothy",
    "tito": "titus",
    "filemon": "philemon",
    "hebreos": "hebrews",
    "santiago": "james",
    "1 pedro": "1-peter",
    "2 pedro": "2-peter",
    "1 juan": "1-john",
    "2 juan": "2-john",
    "3 juan": "3-john",
    "judas": "jude",
    "apocalipsis": "revelation",
}
MARKER = re.compile(
    r"^(\d{1,3}:\d{1,3}(?:[ \t]*[-–—,][ \t]*\d{1,3}(?::\d{1,3})?)*)"
    r"(?:\.[ \t]+|[ \t]*$)",
    re.MULTILINE,
)
SINGLE_CHAPTER_BOOKS = {"philemon", "2-john", "3-john", "jude"}
SINGLE_MARKER = re.compile(
    r"^(\d{1,2}(?:[ \t]*[-–—,][ \t]*\d{1,2})*)(?:\.[ \t]+|[ \t]*$)", re.MULTILINE
)


def page_book(text: str) -> str | None:
    found = set()
    for line in text.splitlines()[:5]:
        heading = normalize(line).strip(" .·*")
        for alias, book in BOOKS.items():
            if re.match(rf"^{re.escape(alias)}\s+\d+:", heading):
                found.add(book)
            elif book in SINGLE_CHAPTER_BOOKS and re.fullmatch(
                rf"{re.escape(alias)}\s+\d+(?:[-–—, ]+\d+)*[ .]*", heading
            ):
                found.add(book)
    return next(iter(found)) if len(found) == 1 else None


def referral_only(body: str) -> bool:
    compact = " ".join(body.split())
    if len(compact) >= 350:
        return False
    return bool(
        re.match(
            r"^(?:V[eé]ase|Ver (?:el comentario|los comentarios)|"
            r"Vea (?:el comentario|los comentarios))\b",
            compact,
            re.IGNORECASE,
        )
        or (
            re.match(r"^Con respecto a .{0,100}\bcf[.]", compact, re.IGNORECASE)
            and "ver el comentario" in compact.lower()
        )
    )


def extract(snapshot: Snapshot) -> Extraction:
    if snapshot.checksum != CHECKSUM:
        raise ValueError("Keener edition checksum mismatch")
    result = Extraction(version="keener-cultural-v1")
    for page in snapshot.pages:
        result.processed_pages += 1
        book = page_book(page.text)
        markers = list(MARKER.finditer(page.text))
        single_chapter = book in SINGLE_CHAPTER_BOOKS and not markers
        if single_chapter:
            markers = list(SINGLE_MARKER.finditer(page.text))
        if not book:
            result.exceptions.append(
                {"page": page.physicalPage, "reason": "no-explicit-running-book"}
            )
            continue
        if any(
            line.strip().isupper() and BOOKS.get(normalize(line)) not in (None, book)
            for line in page.text.splitlines()
        ):
            result.exceptions.append(
                {"page": page.physicalPage, "reason": "book-transition-needs-layout-review"}
            )
            continue
        for index, marker in enumerate(markers):
            end = markers[index + 1].start() if index + 1 < len(markers) else len(page.text)
            quote = page.text[marker.start() : end].strip()
            body = page.text[marker.end() : end].strip()
            locator = marker[1].replace(" ", "")
            if single_chapter:
                locator = "1:" + locator
            destinations = targets(locator, book, snapshot, False)
            reason = None
            if not destinations:
                reason = "invalid-primary-lemma"
            elif (
                len(body) < 100
                or referral_only(body)
                or len(quote) > 12000
                or page.text.count(quote) != 1
            ):
                reason = "short-crossreference-or-ambiguous-fragment"
            elif any(
                span.physicalPage == page.physicalPage
                and span.startOffset < len(page.text[:end].encode("utf-16-le")) // 2
                and span.endOffset > len(page.text[: marker.start()].encode("utf-16-le")) // 2
                for span in snapshot.protectedSpans
            ):
                reason = "protected-editorial-evidence"
            if reason:
                result.exceptions.append(
                    {"page": page.physicalPage, "locator": locator, "reason": reason}
                )
                continue
            for target in destinations:
                rationale = (
                    "O cabeçalho explicita o livro e o lema inicia uma nota de contexto cultural; "
                    "referências dentro do corpo não determinam o destino."
                )
                result.notes.append(
                    {
                        "sourceChecksum": snapshot.checksum,
                        "fragments": [{"physicalPage": page.physicalPage, "quote": quote}],
                        "rawReference": f"{book} {locator}",
                        "passage": target,
                        "additionalPassages": [],
                        "relationType": "discusses",
                        "relationScope": "verse"
                        if target["verseStart"] == target["verseEnd"]
                        else "range",
                        "domains": ["historical-context", "exegesis"],
                        "analysis": {
                            "title": f"Keener · {book} {locator}",
                            "summary": quote,
                            "mode": "source-excerpt",
                            "contentType": "historical-context",
                            "rationale": rationale,
                            "sourceContext": {
                                "kind": "cultural-commentary",
                                "locator": locator,
                                "sectionPath": [book, locator],
                                "authorLabel": "Craig S. Keener",
                            },
                            "limitations": [
                                "Texto espanhol recuperado por OCR; confira a página original.",
                                "Recorte local à página, com possível continuação "
                                "na página seguinte.",
                                "Ligação determinística automática; não equivale a revisão "
                                "histórica ou teológica individual.",
                            ],
                        },
                    }
                )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    snapshot = Snapshot.model_validate_json(args.snapshot.read_text(encoding="utf-8"))
    publish_staging(extract(snapshot), snapshot, args.output)


if __name__ == "__main__":
    main()
