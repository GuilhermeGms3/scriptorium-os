"""Exercise the real routes and SQLite, never download or start an inference model."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import local_pipeline as pipeline
from app.main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("SCRIPTORIUM_PIPELINE_DATA", str(tmp_path))
    for prefix in ["SCRIPTORIUM_EMBEDDING", "SCRIPTORIUM_LLM"]:
        monkeypatch.delenv(f"{prefix}_MODEL", raising=False)
        monkeypatch.delenv(f"{prefix}_REVISION", raising=False)
    pipeline.vector_matrix.cache_clear()
    return TestClient(app, base_url="http://127.0.0.1")


def candidate(identifier: str = "unit:a", edition: str = "edition:a") -> dict:
    return {
        "id": identifier,
        "editionId": edition,
        "text": "Perdoai os inimigos e amai.",
        "passage": {
            "workId": "work:matthew",
            "bookId": "matthew",
            "chapter": 5,
            "verseStart": 44,
            "verseEnd": 44,
            "versificationSchemeId": "test",
        },
    }


def link(client: TestClient, **options: object):
    return client.post(
        "/v1/pipeline/link",
        json={
            "unitId": "excerpt:1",
            "text": "😀 O autor ensina: amai os inimigos.",
            "editionId": "edition:a",
            **options,
        },
    )


def configure_llm(monkeypatch: pytest.MonkeyPatch, selections: list[dict]) -> None:
    monkeypatch.setenv("SCRIPTORIUM_LLM_MODEL", "fake-model")
    monkeypatch.setenv("SCRIPTORIUM_LLM_REVISION", "fake-revision")
    monkeypatch.setattr(
        pipeline,
        "local_post",
        lambda *args: {
            "choices": [{"message": {"content": json.dumps({"selections": selections})}}]
        },
    )


def selection(**overrides: object) -> dict:
    return {
        "candidateId": "unit:a",
        "evidenceQuote": "amai os inimigos",
        "relationType": "discusses",
        "rationale": "Explicit exposition.",
        **overrides,
    }


def test_unprepared_index_is_recoverable(client: TestClient) -> None:
    assert link(client).status_code == 409


def test_index_is_idempotent_and_editions_are_isolated(client: TestClient) -> None:
    body = {"candidates": [candidate()]}
    assert client.post("/v1/pipeline/index", json=body).json() == {"changed": 1, "indexed": 1}
    assert client.post("/v1/pipeline/index", json=body).json() == {"changed": 0, "indexed": 1}
    assert link(client, editionId="edition:other").status_code == 409
    result = link(client).json()
    assert result["status"] == "needs-review"
    assert result["candidates"][0]["editionId"] == "edition:a"
    assert result["decisions"] == []


@pytest.mark.parametrize(
    "selections",
    [
        [selection(evidenceQuote="Evidence absent from the source")],
        [selection(candidateId="unit:outside")],
        [selection(), selection()],
    ],
)
def test_rejects_hallucinated_evidence_unknown_and_duplicate_candidates(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    selections: list[dict],
) -> None:
    client.post("/v1/pipeline/index", json={"candidates": [candidate()]})
    configure_llm(monkeypatch, selections)
    assert link(client, useLlm=True).status_code == 503
    assert client.get("/health").status_code == 200


def test_literal_evidence_uses_utf16_offsets(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    client.post("/v1/pipeline/index", json={"candidates": [candidate()]})
    configure_llm(monkeypatch, [selection()])
    response = link(client, useLlm=True)
    assert response.status_code == 200
    result = response.json()["decision"]
    text = "😀 O autor ensina: amai os inimigos."
    assert result["evidenceStart"] == len(text[: text.index("amai")].encode("utf-16-le")) // 2
    assert (
        text.encode("utf-16-le")[result["evidenceStart"] * 2 : result["evidenceEnd"] * 2].decode(
            "utf-16-le"
        )
        == "amai os inimigos"
    )
    assert result["editionId"] == "edition:a"


def test_abstention_and_gate_are_recoverable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    client.post("/v1/pipeline/index", json={"candidates": [candidate()]})
    configure_llm(monkeypatch, [])
    assert link(client, useLlm=True).json()["status"] == "abstained"
    pipeline.gate.acquire()
    try:
        assert link(client).status_code == 429
    finally:
        pipeline.gate.release()
    assert link(client).status_code == 200


def configure_embeddings(monkeypatch):
    monkeypatch.setenv("SCRIPTORIUM_EMBEDDING_MODEL", "fake-embedding")
    monkeypatch.setenv("SCRIPTORIUM_EMBEDDING_REVISION", "revision:1")

    def post(kind, endpoint, payload):
        assert kind == "embedding" and endpoint == "embeddings"  # Never use the generative LLM.
        return {
            "data": [
                {
                    "object": "embedding",
                    "index": i,
                    "embedding": [1.0, 0.0]
                    if "perdão" in text or "Perdoai" in text
                    else [0.0, 1.0],
                }
                for i, text in enumerate(payload["input"])
            ]
        }

    monkeypatch.setattr(pipeline, "local_post", post)


def search(client, query="perdão", edition="edition:a", **options):
    return client.post(
        "/v1/pipeline/search", json={"query": query, "editionId": edition, **options}
    )


def test_semantic_search_uses_global_vectors_and_invalidates_on_mutation(client, monkeypatch):
    configure_embeddings(monkeypatch)
    a = candidate()
    b = candidate("unit:b")
    b["text"] = "Um assunto distinto."
    assert client.post("/v1/pipeline/index", json={"candidates": [a, b]}).status_code == 200
    result = search(client).json()
    assert result["embeddingConfigured"] is True
    assert result["hits"][0]["candidate"]["id"] == "unit:a"
    assert result["hits"][0]["lexicalRank"] is None
    assert result["hits"][0]["semanticRank"] == 1
    assert len(search(client, limit=1).json()["hits"]) == 1
    a["text"] = "Assunto modificado."
    assert client.post("/v1/pipeline/index", json={"candidates": [a]}).json()["changed"] == 1
    assert search(client).json()["hits"][0]["candidate"]["text"] == a["text"]
    assert search(client, edition="edition:other").status_code == 409
    monkeypatch.setenv("SCRIPTORIUM_EMBEDDING_REVISION", "revision:2")
    assert search(client).status_code == 409
    assert client.post("/v1/pipeline/index", json={"candidates": [a, b]}).status_code == 200
    assert search(client).status_code == 200


def test_search_lexical_fallback_validation_and_gate(client):
    assert search(client).status_code == 409
    client.post("/v1/pipeline/index", json={"candidates": [candidate()]})
    response = search(client, "inimigos").json()
    assert response["embeddingConfigured"] is False
    assert response["retrieval"] == "fts5"
    assert len(response["hits"]) == 1
    assert search(client, "zzzzzzz").json()["hits"] == []
    assert search(client, "  ").status_code == 422
    assert search(client, limit=100).status_code == 422
    pipeline.gate.acquire()
    try:
        assert search(client).status_code == 429
    finally:
        pipeline.gate.release()


def test_index_rejects_edition_reuse_and_rolls_back_failed_embedding(client, monkeypatch):
    client.post("/v1/pipeline/index", json={"candidates": [candidate()]})
    assert (
        client.post(
            "/v1/pipeline/index", json={"candidates": [candidate(edition="other")]}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/v1/pipeline/index", json={"candidates": [candidate(), candidate("b", "other")]}
        ).status_code
        == 422
    )
    configure_embeddings(monkeypatch)
    monkeypatch.setattr(
        pipeline, "local_post", lambda *args: {"data": [{"index": 0, "embedding": [float("nan")]}]}
    )
    assert (
        client.post("/v1/pipeline/index", json={"candidates": [candidate("new")]}).status_code
        == 503
    )
    with pipeline.database() as db:
        assert db.execute("SELECT count(*) FROM candidates WHERE id='new'").fetchone()[0] == 0
    assert client.get("/health").status_code == 200


def test_dimension_mismatch_is_recoverable(client, monkeypatch):
    configure_embeddings(monkeypatch)
    client.post("/v1/pipeline/index", json={"candidates": [candidate()]})
    monkeypatch.setattr(pipeline, "document_vector", lambda text: [1.0, 0.0, 0.0])
    assert search(client).status_code == 503
