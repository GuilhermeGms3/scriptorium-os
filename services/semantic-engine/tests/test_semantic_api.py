from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, base_url="http://127.0.0.1")


def test_refuses_requests_addressed_to_another_host() -> None:
    rebinding = TestClient(app, base_url="http://attacker.example")
    assert rebinding.get("/health").status_code == 400
    assert client.get("/health").status_code == 200


def test_refuses_a_post_that_is_not_json() -> None:
    response = client.post(
        "/v1/analyze/batch",
        content='{"units": []}',
        headers={"content-type": "text/plain"},
    )
    assert response.status_code == 415


def test_analyze_batch_exposes_versioned_incremental_contract() -> None:
    response = client.post(
        "/v1/analyze/batch",
        json={
            "units": [
                {
                    "id": "unit:1",
                    "text": "Agostinho afirma que o Verbo existe desde a eternidade.",
                    "kind": "paragraph",
                    "language": "pt-BR",
                }
            ],
            "checkpoint": {},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["analyzerId"] == "contextual-rule-analyzer"
    assert body["analyzerRevision"] == "3"
    assert body["checkpoint"]["lastPersonLabel"] == "Agostinho"
    assert body["proposals"][0]["payload"]["kind"] == "attribution"


def test_analyze_batch_rejects_oversized_units() -> None:
    response = client.post(
        "/v1/analyze/batch",
        json={
            "units": [
                {
                    "id": "unit:oversized",
                    "text": "a" * 20_001,
                    "kind": "paragraph",
                    "language": "pt-BR",
                }
            ]
        },
    )

    assert response.status_code == 422
