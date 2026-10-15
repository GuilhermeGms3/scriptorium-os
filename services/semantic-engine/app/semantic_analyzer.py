from __future__ import annotations

import re
from dataclasses import dataclass

ANALYZER_ID = "contextual-rule-analyzer"
ANALYZER_REVISION = "2"

_SUBJECT = re.compile(
    r"^(?P<agent>[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wÀ-ÿ.'’_-]*(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wÀ-ÿ.'’_-]*){0,4})\s+"
    r"(?P<verb>afirma|argumenta|sustenta|defende|escreve|observa|declara|interpreta|rejeita|questiona|"
    r"reports?|argues?|states?|writes?|observes?|rejects?|questions?)\s+(?:que\s+|that\s+)?"
    r"(?P<statement>.{15,})$",
    re.IGNORECASE,
)
_PREFIXED = re.compile(
    r"^(?:segundo|conforme|para|de acordo com|according to)\s+"
    r"(?P<agent>[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wÀ-ÿ.'’ -]{1,80}?)(?:,|\s+afirma\s+)"
    r"(?P<statement>.{15,})$",
    re.IGNORECASE,
)
_PRONOUN = re.compile(
    r"^(?P<mention>ele|ela|o autor|a autora|he|she|the author)\s+"
    r"(?P<verb>afirma|argumenta|sustenta|defende|escreve|observa|declara|interpreta|rejeita|questiona|"
    r"reports?|argues?|states?|writes?|observes?|rejects?|questions?)\s+(?:que\s+|that\s+)?"
    r"(?P<statement>.{15,})$",
    re.IGNORECASE,
)
_YEAR = re.compile(r"(?:^|\D)((?:1[4-9]|20)\d{2})(?:[a-z])?(?:\D|$)")
_LOCATOR = re.compile(r"\b(?:p{1,2}|v|vol|cap)\.\s*[\divxlcdm–-]+", re.IGNORECASE)


@dataclass(frozen=True)
class AnalyzerUnit:
    id: str
    text: str
    kind: str
    language: str


@dataclass(frozen=True)
class AnalyzerProposal:
    unit_id: str
    payload: dict[str, object]
    confidence: float


def _relation(verb: str) -> str:
    lowered = verb.lower()
    if "rejeit" in lowered or "reject" in lowered:
        return "rejects"
    if "question" in lowered:
        return "questions"
    if "escrev" in lowered or "write" in lowered:
        return "quotes"
    if "observ" in lowered or "declar" in lowered or "report" in lowered:
        return "reports"
    return "asserts"


def _sentences(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?…])\s+", text) if len(part.strip()) >= 20]


def _looks_like_agent(value: str) -> bool:
    normalized = " ".join(value.split())
    if not normalized or not normalized[0].isupper():
        return False
    first = normalized.split(maxsplit=1)[0].lower()
    return first not in {"o", "a", "os", "as", "um", "uma", "seu", "sua", "the", "his", "her"}


def _bibliography(text: str) -> dict[str, object] | None:
    normalized = " ".join(text.split())
    segments = [part.strip() for part in re.split(r"\.\s+", normalized) if part.strip()]
    if len(normalized) < 20 or len(segments) < 2:
        return None
    authors = [
        value.strip(" ,")
        for value in re.split(r"\s*(?:;|\be\b|\band\b|&)\s*", segments[0], flags=re.IGNORECASE)
        if 2 <= len(value.strip(" ,")) <= 120
    ]
    year = _YEAR.search(normalized)
    locator = _LOCATOR.search(normalized)
    result: dict[str, object] = {
        "kind": "bibliographic-reference",
        "rawText": normalized,
        "authors": authors,
        "title": segments[1].rstrip(" ,;:"),
        "referenceType": "web" if "http://" in normalized or "https://" in normalized else "book",
    }
    if year:
        result["year"] = int(year.group(1))
    if locator:
        result["locator"] = locator.group(0)
    return result


def analyze_units(
    units: list[AnalyzerUnit], checkpoint: dict[str, object] | None = None
) -> tuple[list[AnalyzerProposal], dict[str, object]]:
    state = dict(checkpoint or {})
    last_person = state.get("lastPersonLabel")
    proposals: list[AnalyzerProposal] = []

    for unit in units:
        if unit.kind == "bibliography-entry":
            payload = _bibliography(unit.text)
            if payload:
                proposals.append(AnalyzerProposal(unit.id, payload, 0.76))
                authors = payload.get("authors")
                if isinstance(authors, list) and authors and isinstance(authors[0], str):
                    last_person = authors[0]

        for sentence in _sentences(unit.text):
            coreference = _PRONOUN.match(sentence)
            if coreference and isinstance(last_person, str):
                mention = coreference.group("mention")
                statement = " ".join(coreference.group("statement").split())
                proposals.extend(
                    [
                        AnalyzerProposal(
                            unit.id,
                            {
                                "kind": "coreference",
                                "mention": mention,
                                "resolvedLabel": last_person,
                                "entityType": "person",
                                "basis": "recent-attribution",
                            },
                            0.68,
                        ),
                        AnalyzerProposal(
                            unit.id,
                            {
                                "kind": "attribution",
                                "statement": statement,
                                "agentLabel": last_person,
                                "agentType": "person",
                                "relation": _relation(coreference.group("verb")),
                                "resolution": "coreference",
                            },
                            0.64,
                        ),
                    ]
                )
                continue

            explicit = _PREFIXED.match(sentence) or _SUBJECT.match(sentence)
            if explicit:
                agent = " ".join(explicit.group("agent").split())
                if not _looks_like_agent(agent):
                    continue
                statement = " ".join(explicit.group("statement").split())
                verb = explicit.groupdict().get("verb") or "afirma"
                last_person = agent
                proposals.append(
                    AnalyzerProposal(
                        unit.id,
                        {
                            "kind": "attribution",
                            "statement": statement,
                            "agentLabel": agent,
                            "agentType": "person",
                            "relation": _relation(verb),
                            "resolution": "explicit",
                        },
                        0.82,
                    )
                )
                continue

    if isinstance(last_person, str):
        state["lastPersonLabel"] = last_person
    state["processedUnits"] = int(state.get("processedUnits", 0)) + len(units)
    return proposals, state
