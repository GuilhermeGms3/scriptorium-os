import json
import sqlite3

import pytest

from app.teb_source import TEB, attach_corrections, grams, match_chapter, page_parts


def test_matching_uses_scripture_body_not_references_in_the_note() -> None:
    texts = {
        1: grams(
            "No principio Deus criou os ceus e a terra; a terra era vazia, "
            "havia trevas sobre o abismo e o Espirito de Deus pairava sobre as aguas."
        ),
        2: grams(
            "Foram acabados os ceus e a terra com todo o seu exercito. "
            "Deus descansou no setimo dia de toda a sua obra que tinha feito."
        ),
    }
    assert (
        match_chapter(
            "No principio Deus criou os ceus e a terra; a terra era vazia, "
            "havia trevas sobre o abismo e o Espirito de Deus pairava sobre as aguas.",
            texts,
        )[0]
        == 1
    )  # type: ignore[index]
    assert match_chapter("Gn 1:1", texts) is None
    assert match_chapter("texto incerto " * 40, texts) is None


def test_notes_do_not_swallow_scripture_in_the_other_column() -> None:
    items = [
        ("Texto biblico da coluna esquerda.", 8, 44, 400),
        ("a. Esta explicacao pertence a primeira nota.", 6, 16, 200),
        ("Texto biblico da coluna direita deve ficar separado.", 8, 205, 400),
        ("b. Esta explicacao pertence a outra nota.", 6, 214, 200),
    ]
    text = "\n".join(x[0] for x in items)
    layout = [{"text": t, "height": h, "transform": [h, 0, 0, h, x, y]} for t, h, x, y in items]
    body, notes = page_parts(text, json.dumps({"layout": layout}))
    assert "coluna direita" in body
    assert len(notes) == 2
    assert all("Texto biblico" not in n["quote"] for n in notes)
    assert all(text[n["start"] : n["end"]] == n["quote"] for n in notes)


def test_ambiguous_matching_is_withheld() -> None:
    text = (
        "A mesma passagem longa com palavras repetidas e a mesma criacao do ceu e da terra, "
        "a historia desta passagem muito semelhante em ambos os capitulos."
    )
    assert match_chapter(text, {1: grams(text), 2: grams(text)}) is None


def correction_fixture(review: str) -> tuple[sqlite3.Connection, dict[str, object]]:
    db = sqlite3.connect(":memory:")
    db.executescript(
        "CREATE TABLE knowledge_proposals(id,document_id,payload_json,review_status,proposal_kind);"
        "CREATE TABLE pipeline_decisions(proposal_id,audit_status,publication);"
    )
    payload = {
        "rawReference": "TEB · teste",
        "passage": {"chapter": 1},
        "relationScope": "chapter",
        "contextualAnalysis": {"summary": "Trecho literal.", "rationale": "Original"},
    }
    db.execute(
        "INSERT INTO knowledge_proposals VALUES(?,?,?,?,?)",
        ("proposal:1", "private-document:" + TEB, json.dumps(payload), review, "passage-relation"),
    )
    db.execute("INSERT INTO pipeline_decisions VALUES('proposal:1','pending','machine-visible')")
    return db, {
        "rawReference": "TEB · teste",
        "passage": {"chapter": 2},
        "relationScope": "chapter",
        "analysis": {"summary": "Trecho literal.", "rationale": "Nova"},
    }


def test_calibration_preserves_human_reviews_and_records_original_payload_hash() -> None:
    db, note = correction_fixture("machine-proposed")
    try:
        assert attach_corrections(db, [note]) == 1
        assert len(note["supersedes"]["payloadChecksum"]) == 64  # type: ignore[index]
        assert (
            db.execute("SELECT review_status FROM knowledge_proposals").fetchone()[0]
            == "machine-proposed"
        )
    finally:
        db.close()
    db, note = correction_fixture("accepted")
    try:
        with pytest.raises(ValueError, match="revisão humana"):
            attach_corrections(db, [note])
    finally:
        db.close()


def test_score_only_change_does_not_replace_an_existing_identity() -> None:
    db, note = correction_fixture("accepted")
    try:
        note["passage"] = {"chapter": 1}
        assert attach_corrections(db, [note]) == 0
        assert note["analysis"]["rationale"] == "Original"  # type: ignore[index]
    finally:
        db.close()
