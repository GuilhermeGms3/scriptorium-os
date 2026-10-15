from __future__ import annotations

import re
from dataclasses import dataclass

ANALYZER_ID = "contextual-rule-analyzer"
ANALYZER_REVISION = "3"

# Case matters: a name starts with a capital, so no global IGNORECASE. Only verbs, conjunctions,
# prefixes and pronouns are matched in any case, through (?i:...).
_UPPER = "A-ZÁÀÂÃÉÊÍÓÔÕÚÇ"
_NAME_WORD = rf"[{_UPPER}][\wÀ-ÿ'’-]*\.?"
# "Tomás de Aquino", "S. Tomás", "Gregório de Nissa e Basílio".
_NAME = rf"{_NAME_WORD}(?:\s+(?:(?:de|da|do|dos|das|e)\s+)?{_NAME_WORD}){{0,4}}"
_VERB = (
    r"(?i:afirma|argumenta|sustenta|defende|escreve|observa|declara|interpreta|rejeita|questiona|"
    r"reports?|argues?|states?|writes?|observes?|rejects?|questions?)"
)
# "Agostinho, nas Confissões, afirma" or "Agostinho em suas Confissões afirma".
_COMPLEMENT = r"(?:\s*,\s*[^,]{1,80}?\s*,|\s+(?i:em|no|na|nos|nas|in)\s+[^,.;]{1,60}?)"
_THAT = r"(?:(?i:que|that)\s+)?"

_SUBJECT = re.compile(
    rf"^(?P<agent>{_NAME}){_COMPLEMENT}?\s+(?P<verb>{_VERB})\s+{_THAT}(?P<statement>.{{15,}})$"
)
_PREFIXED = re.compile(
    rf"^(?i:segundo|conforme|para|de acordo com|according to)\s+(?P<agent>{_NAME})"
    rf"(?:\s*,\s*|\s+(?i:afirma)\s+{_THAT})(?P<statement>.{{15,}})$"
)
_PRONOUN = re.compile(
    r"^(?P<mention>(?i:ele|ela|o autor|a autora|he|she|the author))\s+"
    rf"(?P<verb>{_VERB})\s+{_THAT}(?P<statement>.{{15,}})$"
)
_YEAR = re.compile(r"(?:^|\D)((?:1[4-9]|20)\d{2})(?:[a-z])?(?:\D|$)")
_LOCATOR = re.compile(r"\b(?:p{1,2}|v|vol|cap)\.\s*[\divxlcdm–-]+", re.IGNORECASE)

# Abbreviations whose period never ends a sentence: "cf. Jo 1", "S. Tomás", "p. 12", "séc. IV".
# "n.º" needs no protection: its period is never followed by a space.
_ABBREVIATION = re.compile(r"(?<!\w)(?:(?i:cf|sto|pp|vv|cap|vol|ed|trad|séc|p|v)|S)\.")
_PROTECTED_PERIOD = ""

# A demonstrative or a document is not a person: "Este capítulo afirma", "O texto afirma".
_NOT_A_PERSON = {
    "o", "a", "os", "as", "um", "uma", "uns", "umas", "seu", "sua", "seus", "suas",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
    "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo",
    "the", "this", "that", "these", "those", "his", "her", "its", "it",
}  # fmt: skip
_DOCUMENT_NOUNS = {
    "capítulo", "texto", "livro", "artigo", "parágrafo", "seção", "secção", "versículo",
    "passagem", "documento", "obra", "nota", "chapter", "text", "book", "article", "section",
    "passage", "document", "note",
}  # fmt: skip

# ABNT: "SILVA, J. P. Título." or "SILVA, João. Título."; initials keep their own periods.
_ABNT_PERSON = rf"[^,.;]+,\s*(?:(?:[{_UPPER}]\.\s*)+|[^.;]+?)"
_ABNT_AUTHORS = re.compile(
    rf"^(?P<authors>{_ABNT_PERSON}(?:\s*(?:;|\be\b|\band\b|&)\s*{_ABNT_PERSON})*)\.?\s+"
    r"(?P<rest>\S.*)$"
)
_AUTHOR_SEPARATOR = re.compile(r"\s*(?:;|\be\b|\band\b|&)\s*", re.IGNORECASE)

# "Ele afirma" resolves only to a person named at most this many units before.
_COREFERENCE_WINDOW = 3


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
    protected = _ABBREVIATION.sub(
        lambda match: match.group(0)[:-1] + _PROTECTED_PERIOD, text
    )
    return [
        sentence
        for part in re.split(r"(?<=[.!?…])\s+", protected)
        if len(sentence := part.strip().replace(_PROTECTED_PERIOD, ".")) >= 20
    ]


def _looks_like_agent(value: str) -> bool:
    words = value.lower().split()
    if not words or not value[0].isupper():
        return False
    return words[0] not in _NOT_A_PERSON and not any(word in _DOCUMENT_NOUNS for word in words)


def _bibliography(text: str) -> dict[str, object] | None:
    normalized = " ".join(text.split())
    segments = [part.strip() for part in re.split(r"\.\s+", normalized) if part.strip()]
    if len(normalized) < 20 or len(segments) < 2:
        return None
    abnt = _ABNT_AUTHORS.match(normalized)
    if abnt:
        author_part = abnt.group("authors")
        rest = [part.strip() for part in re.split(r"\.\s+", abnt.group("rest")) if part.strip()]
    else:
        author_part, rest = segments[0], segments[1:]
    if not rest:
        return None
    authors = [
        value.strip(" ,.")
        for value in _AUTHOR_SEPARATOR.split(author_part)
        if 2 <= len(value.strip(" ,.")) <= 120
    ]
    year = _YEAR.search(normalized)
    locator = _LOCATOR.search(normalized)
    result: dict[str, object] = {
        "kind": "bibliographic-reference",
        "rawText": normalized,
        "authors": authors,
        "title": rest[0].rstrip(" ,;:."),
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
    processed = state.get("processedUnits", 0)
    first_index = processed if isinstance(processed, int) else 0
    last_person = state.get("lastPersonLabel")
    # Absolute unit index across batches; older checkpoints without it never resolve "Ele".
    last_person_unit = state.get("lastPersonUnit")
    proposals: list[AnalyzerProposal] = []

    def remember(label: str, index: int) -> None:
        nonlocal last_person, last_person_unit
        last_person, last_person_unit = label, index

    for offset, unit in enumerate(units):
        index = first_index + offset
        if unit.kind == "bibliography-entry":
            payload = _bibliography(unit.text)
            if payload:
                proposals.append(AnalyzerProposal(unit.id, payload, 0.76))
                authors = payload.get("authors")
                if isinstance(authors, list) and authors and isinstance(authors[0], str):
                    remember(authors[0], index)

        for sentence in _sentences(unit.text):
            coreference = _PRONOUN.match(sentence)
            if coreference:
                if (
                    isinstance(last_person, str)
                    and isinstance(last_person_unit, int)
                    and index - last_person_unit <= _COREFERENCE_WINDOW
                ):
                    statement = " ".join(coreference.group("statement").split())
                    proposals.extend(
                        [
                            AnalyzerProposal(
                                unit.id,
                                {
                                    "kind": "coreference",
                                    "mention": coreference.group("mention"),
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
            if not explicit:
                continue
            agent = " ".join(explicit.group("agent").split())
            if not _looks_like_agent(agent):
                continue
            statement = " ".join(explicit.group("statement").split())
            verb = explicit.groupdict().get("verb") or "afirma"
            remember(agent, index)
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

    if isinstance(last_person, str):
        state["lastPersonLabel"] = last_person
    if isinstance(last_person_unit, int):
        state["lastPersonUnit"] = last_person_unit
    state["processedUnits"] = first_index + len(units)
    return proposals, state
