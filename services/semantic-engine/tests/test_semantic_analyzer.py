import pytest

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
                "Segundo o seu sábio e santo conselho, foi Deus servido permitir este "
                "acontecimento.",
            )
        ]
    )
    assert proposals == []


def attributions(text: str) -> list[dict[str, object]]:
    proposals, _ = analyze_units([unit("u1", text)])
    return [proposal.payload for proposal in proposals if proposal.payload["kind"] == "attribution"]


@pytest.mark.parametrize(
    ("text", "agent"),
    [
        ("Agostinho em suas Confissões afirma que o tempo é uma distensão da alma.", "Agostinho"),
        ("Agostinho, nas Confissões, afirma que o tempo é uma distensão da alma.", "Agostinho"),
        ("Tomás de Aquino, na Suma, afirma que a graça não destrói a natureza.", "Tomás de Aquino"),
    ],
)
def test_agent_stops_at_lowercase_words_and_accepts_name_particles(text: str, agent: str) -> None:
    assert [payload["agentLabel"] for payload in attributions(text)] == [agent]


@pytest.mark.parametrize(
    "text",
    [
        "Este capítulo afirma que a graça precede toda obra humana.",
        "Esta seção sustenta que a criação depende inteiramente de Deus.",
        "Esse livro defende que o Verbo existe desde a eternidade.",
    ],
)
def test_documents_and_demonstratives_are_not_people(text: str) -> None:
    assert attributions(text) == []


@pytest.mark.parametrize(
    "abbreviation",
    ["cf.", "S.", "Sto.", "p.", "pp.", "v.", "vv.", "cap.", "vol.", "ed.", "trad.", "séc."],
)
def test_abbreviations_do_not_split_the_sentence(abbreviation: str) -> None:
    text = f"Segundo Agostinho, a graça ({abbreviation} 12) aperfeiçoa a natureza sem destruí-la."
    assert [payload["statement"] for payload in attributions(text)] == [
        f"a graça ({abbreviation} 12) aperfeiçoa a natureza sem destruí-la."
    ]


def test_saint_abbreviation_is_part_of_the_agent() -> None:
    assert attributions("Segundo S. Tomás, a graça aperfeiçoa a natureza humana.") == [
        {
            "kind": "attribution",
            "statement": "a graça aperfeiçoa a natureza humana.",
            "agentLabel": "S. Tomás",
            "agentType": "person",
            "relation": "asserts",
            "resolution": "explicit",
        }
    ]


def test_abnt_reference_with_initials() -> None:
    proposals, _ = analyze_units(
        [
            unit(
                "u1",
                "SILVA, J. P. Teologia sistemática. São Paulo: Vida Nova, 2010.",
                "bibliography-entry",
            )
        ]
    )
    assert proposals[0].payload["authors"] == ["SILVA, J. P"]
    assert proposals[0].payload["title"] == "Teologia sistemática"
    assert proposals[0].payload["year"] == 2010


NEUTRAL = "A criação manifesta a bondade de Deus em todas as coisas visíveis."
NAMED = "Agostinho afirma que o Verbo existe desde a eternidade."
PRONOUN = "Ele sustenta que todas as coisas foram criadas pelo Verbo eterno."


@pytest.mark.parametrize(
    "batches",
    [
        [[NAMED, NEUTRAL, NEUTRAL, NEUTRAL, PRONOUN]],
        [[NAMED, NEUTRAL], [NEUTRAL, NEUTRAL, PRONOUN]],
        [[NAMED], [NEUTRAL], [NEUTRAL], [NEUTRAL], [PRONOUN]],
    ],
)
def test_coreference_does_not_reach_further_than_three_units(batches: list[list[str]]) -> None:
    checkpoint: dict[str, object] | None = None
    kinds: list[object] = []
    counter = 0
    for batch in batches:
        units = []
        for text in batch:
            counter += 1
            units.append(unit(f"u{counter}", text))
        proposals, checkpoint = analyze_units(units, checkpoint)
        kinds.extend(proposal.payload["kind"] for proposal in proposals)
    assert "coreference" not in kinds


def test_checkpoint_keeps_the_position_of_the_named_person() -> None:
    _, checkpoint = analyze_units([unit("u1", NEUTRAL), unit("u2", NAMED)])
    assert checkpoint["lastPersonLabel"] == "Agostinho"
    assert checkpoint["lastPersonUnit"] == 1


@pytest.mark.parametrize(
    ("batches", "resolved"),
    [
        ([[NAMED, NEUTRAL, NEUTRAL, PRONOUN]], "Agostinho"),
        ([[NAMED], [NEUTRAL, NEUTRAL], [PRONOUN]], "Agostinho"),
    ],
)
def test_coreference_within_three_units_still_resolves(
    batches: list[list[str]], resolved: str
) -> None:
    """Guard: already worked before the limit; it must keep working."""
    checkpoint: dict[str, object] | None = None
    labels: list[object] = []
    counter = 0
    for batch in batches:
        units = []
        for text in batch:
            counter += 1
            units.append(unit(f"u{counter}", text))
        proposals, checkpoint = analyze_units(units, checkpoint)
        labels.extend(
            proposal.payload["resolvedLabel"]
            for proposal in proposals
            if proposal.payload["kind"] == "coreference"
        )
    assert labels == [resolved]


@pytest.mark.parametrize(
    ("text", "agent"),
    [
        ("Tomás de Aquino afirma que a graça não destrói a natureza humana.", "Tomás de Aquino"),
        ("Segundo Agostinho, a graça (n.º 12) aperfeiçoa a natureza sem destruí-la.", "Agostinho"),
    ],
)
def test_attributions_that_already_worked(text: str, agent: str) -> None:
    """Guard: these passed before the fixes and must not regress."""
    assert [payload["agentLabel"] for payload in attributions(text)] == [agent]


def test_text_as_subject_is_still_not_a_person() -> None:
    """Guard: already rejected before the fixes."""
    assert attributions("O texto afirma que a criação depende inteiramente de Deus.") == []


def test_abnt_reference_with_given_name_still_works() -> None:
    """Guard: already worked before the fixes."""
    proposals, _ = analyze_units(
        [
            unit(
                "u1",
                "SILVA, João. Teologia sistemática. São Paulo: Vida Nova, 2010.",
                "bibliography-entry",
            )
        ]
    )
    assert proposals[0].payload["authors"] == ["SILVA, João"]
    assert proposals[0].payload["title"] == "Teologia sistemática"
