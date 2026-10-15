from app.semantic_analyzer import AnalyzerUnit, analyze_units


def unit(identifier: str, text: str, kind: str = "paragraph") -> AnalyzerUnit:
    return AnalyzerUnit(identifier, text, kind, "pt-BR")


def test_extracts_explicit_attribution_and_resumes_coreference() -> None:
    first, checkpoint = analyze_units(
        [unit("u1", "Agostinho afirma que o Verbo existe desde a eternidade.")]
    )
    assert first[0].payload == {
        "kind": "attribution",
        "statement": "o Verbo existe desde a eternidade.",
        "agentLabel": "Agostinho",
        "agentType": "person",
        "relation": "asserts",
        "resolution": "explicit",
    }
    second, resumed = analyze_units(
        [unit("u2", "Ele sustenta que todas as coisas foram criadas pelo Verbo.")], checkpoint
    )
    assert [proposal.payload["kind"] for proposal in second] == ["coreference", "attribution"]
    assert second[0].payload["resolvedLabel"] == "Agostinho"
    assert resumed["processedUnits"] == 2


def test_extracts_reviewable_bibliographic_reference() -> None:
    proposals, _ = analyze_units(
        [
            unit(
                "u1",
                "WEGNER, Uwe. Exegese do Novo Testamento. São Leopoldo: Sinodal, 1998.",
                "bibliography-entry",
            )
        ]
    )
    assert proposals[0].payload == {
        "kind": "bibliographic-reference",
        "rawText": "WEGNER, Uwe. Exegese do Novo Testamento. São Leopoldo: Sinodal, 1998.",
        "authors": ["WEGNER, Uwe"],
        "title": "Exegese do Novo Testamento",
        "year": 1998,
        "referenceType": "book",
    }


def test_does_not_invent_an_author_from_a_lowercase_phrase() -> None:
    proposals, _ = analyze_units(
        [
            unit(
                "u1",
                "Segundo o seu sábio e santo conselho, foi Deus servido permitir este acontecimento.",
            )
        ]
    )
    assert proposals == []
