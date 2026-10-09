from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


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
    assert body["analyzerRevision"] == "2"
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
