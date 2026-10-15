import pytest
from pydantic import ValidationError

from app.pipeline_contracts import LinkResponse, SelectionBatch


def selection(candidate_id: str) -> dict:
    return {
        "candidateId": candidate_id,
        "evidenceQuote": "O texto discute João 1:1.",
        "relationType": "discusses",
        "rationale": "A passagem é mencionada no argumento.",
    }


def decision(candidate_id: str) -> dict:
    return {
        **selection(candidate_id),
        "passage": {
            "workId": "work:john",
            "bookId": "john",
            "chapter": 1,
            "verseStart": 1,
            "verseEnd": 1,
            "versificationSchemeId": "eng",
        },
        "editionId": "edition:test",
        "evidenceStart": 0,
        "evidenceEnd": 27,
    }


def test_selection_batch_accepts_multiple_passage_targets() -> None:
    batch = SelectionBatch.model_validate(
        {"selections": [selection("john:1:1"), selection("john:3:16")]}
    )
    assert [item.candidateId for item in batch.selections] == [
        "john:1:1",
        "john:3:16",
    ]


def test_link_response_bounds_multiple_decisions() -> None:
    response = LinkResponse.model_validate(
        {
            "unitId": "unit:1",
            "retrieval": "fts5",
            "candidates": [],
            "status": "needs-review",
            "decision": decision("john:1:1"),
            "decisions": [decision("john:1:1"), decision("john:3:16")],
        }
    )
    assert len(response.decisions) == 2
    with pytest.raises(ValidationError):
        LinkResponse.model_validate(
            {
                "unitId": "unit:1",
                "retrieval": "fts5",
                "candidates": [],
                "status": "needs-review",
                "decision": decision("john:1:1"),
                "decisions": [decision(f"john:1:{index}") for index in range(6)],
            }
        )
