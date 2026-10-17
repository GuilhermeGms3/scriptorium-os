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


def test_checkpoint_roundtrip_preserves_scalars_and_resumes_coreference() -> None:
    first = client.post(
        "/v1/analyze/batch",
        json={
            "units": [
                {
                    "id": "unit:first",
                    "text": "Agostinho afirma que o Verbo existe desde a eternidade.",
                    "kind": "paragraph",
                    "language": "pt-BR",
                }
            ],
            "checkpoint": {"custom": "preserved", "enabled": True, "nullable": None, "ratio": 0.5},
        },
    )
    assert first.status_code == 200
    checkpoint = first.json()["checkpoint"]
    second = client.post(
        "/v1/analyze/batch",
        json={
            "units": [
                {
                    "id": "unit:second",
                    "text": "Ele sustenta que todas as coisas foram criadas pelo Verbo.",
                    "kind": "paragraph",
                    "language": "pt-BR",
                }
            ],
            "checkpoint": checkpoint,
        },
    )
    assert second.status_code == 200
    assert second.json()["checkpoint"]["processedUnits"] == 2
    assert second.json()["checkpoint"]["custom"] == "preserved"
    assert any(p["payload"].get("resolvedLabel") == "Agostinho" for p in second.json()["proposals"])
    assert (
        client.post(
            "/v1/analyze/batch",
            json={
                "units": [
                    {
                        "id": "unit:valid",
                        "text": "Texto válido.",
                        "kind": "paragraph",
                        "language": "pt-BR",
                    }
                ],
                "checkpoint": {"nested": {}},
            },
        ).status_code
        == 422
    )
