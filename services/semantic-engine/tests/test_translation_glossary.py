import json

import pytest

from app.translation_glossary import Glossary, load_glossary


def test_terms_are_case_sensitive_and_word_bounded():
    glossary = load_glossary()
    original = "Logos Torah Septuagint LORD Lord LORDship."
    protected, substitutions = glossary.protect(original)
    assert "Lord LORDship" in protected
    assert (
        glossary.restore(protected, substitutions) == "Logos Torá Septuaginta SENHOR Lord LORDship."
    )


@pytest.mark.parametrize("damage", ["missing", "duplicate", "unknown"])
def test_translation_cannot_silently_drop_or_duplicate_terms(damage):
    glossary = load_glossary()
    protected, substitutions = glossary.protect("LORD")
    damaged = {
        "missing": "Deus",
        "duplicate": protected + protected,
        "unknown": protected + " ZXQTERM99999QXZ",
    }[damage]
    with pytest.raises(ValueError):
        glossary.restore(damaged, substitutions)


def test_editable_glossary_changes_cache_fingerprint(tmp_path, monkeypatch):
    path = tmp_path / "glossary.json"
    monkeypatch.setenv("SCRIPTORIUM_TRANSLATION_GLOSSARY", str(path))
    data = {"version": "1", "rules": [{"source": "LORD", "target": "SENHOR"}]}
    path.write_text(json.dumps(data), encoding="utf-8")
    first = load_glossary().fingerprint
    data["rules"][0]["target"] = "Senhor"
    path.write_text(json.dumps(data), encoding="utf-8")
    assert first != load_glossary().fingerprint


def test_duplicate_rules_rejected():
    with pytest.raises(ValueError):
        Glossary.model_validate({"version": "1", "rules": [{"source": "LORD", "target": "S"}] * 2})
