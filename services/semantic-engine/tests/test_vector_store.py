import json
import sqlite3
from pathlib import Path

import numpy as np
import pytest

from app.vector_store import database, decode_vector, encode_vector


def legacy(path: Path, vector: str = "[0.25, -0.5, 1.0]") -> None:
    with sqlite3.connect(path) as db:
        db.executescript("""
        CREATE TABLE candidates(id TEXT PRIMARY KEY,edition TEXT,payload TEXT,checksum TEXT);
        CREATE TABLE embedding_cache(checksum TEXT,model TEXT,revision TEXT,vector TEXT,
          PRIMARY KEY(checksum,model,revision));
        CREATE TABLE candidate_embeddings(candidate_id TEXT,model TEXT,revision TEXT,
          recipe TEXT,checksum TEXT,vector TEXT,PRIMARY KEY(candidate_id,model,revision,recipe));
        PRAGMA user_version=2;
        """)
        db.execute("INSERT INTO candidates VALUES('a','edition','{}','sha')")
        db.execute("INSERT INTO embedding_cache VALUES('sha','model','rev',?)", (vector,))
        db.execute(
            "INSERT INTO candidate_embeddings VALUES('a','model','rev','recipe','sha',?)", (vector,)
        )


def test_legacy_migration_backup_idempotence_and_foreign_keys(tmp_path, monkeypatch):
    monkeypatch.setenv("SCRIPTORIUM_PIPELINE_DATA", str(tmp_path))
    path = tmp_path / "candidates.sqlite"
    legacy(path)
    with database() as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 3
        row = db.execute("SELECT vector,dimension,typeof(vector) FROM embedding_cache").fetchone()
        assert row[2] == "blob"
        np.testing.assert_array_equal(decode_vector(row[0], row[1]), [0.25, -0.5, 1])
        assert db.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        with pytest.raises(sqlite3.IntegrityError):
            db.execute(
                "INSERT INTO candidate_embeddings VALUES('missing','m','r','p','s',?,3)", (row[0],)
            )
    backups = list(tmp_path.glob("*.before-v3-*"))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as backup:
        assert backup.execute("PRAGMA user_version").fetchone()[0] == 2
        assert json.loads(backup.execute("SELECT vector FROM embedding_cache").fetchone()[0]) == [
            0.25,
            -0.5,
            1,
        ]
    with database() as db:
        db.execute("DELETE FROM candidates WHERE id='a'")
        assert db.execute("SELECT count(*) FROM candidate_embeddings").fetchone()[0] == 0
    assert len(list(tmp_path.glob("*.before-v3-*"))) == 1


def test_invalid_legacy_vector_rolls_back(tmp_path, monkeypatch):
    monkeypatch.setenv("SCRIPTORIUM_PIPELINE_DATA", str(tmp_path))
    path = tmp_path / "candidates.sqlite"
    legacy(path, '["invalid"]')
    with pytest.raises(ValueError), database():
        pass
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 2
        assert db.execute("SELECT vector FROM embedding_cache").fetchone()[0] == '["invalid"]'
        assert not db.execute("SELECT name FROM sqlite_master WHERE name LIKE '%_v2'").fetchall()


def test_unknown_schema_is_not_modified(tmp_path, monkeypatch):
    monkeypatch.setenv("SCRIPTORIUM_PIPELINE_DATA", str(tmp_path))
    path = tmp_path / "candidates.sqlite"
    with sqlite3.connect(path) as db:
        db.execute("PRAGMA user_version=99")
    before = path.read_bytes()
    with pytest.raises(ValueError), database():
        pass
    assert path.read_bytes() == before


@pytest.mark.parametrize(
    "values", [[], [float("nan")], [float("inf")], [True, float("inf")], [1.0] * 4097]
)
def test_invalid_vectors(values):
    with pytest.raises(ValueError):
        encode_vector(values)


def test_blob_size_and_constraints(tmp_path, monkeypatch):
    monkeypatch.setenv("SCRIPTORIUM_PIPELINE_DATA", str(tmp_path))
    blob = encode_vector([0.1, 0.2])
    assert len(blob) == 8
    with pytest.raises(ValueError):
        decode_vector(blob, 3)
    with database() as db, pytest.raises(sqlite3.IntegrityError):
        db.execute("INSERT INTO embedding_cache VALUES('s','m','r',?,3)", (blob,))
