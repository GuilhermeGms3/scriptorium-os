"""Regenerable candidate index. Float32 little-endian vectors, transactional v2→v3 migration."""

from __future__ import annotations

import json
import math
import os
import sqlite3
import time
from collections.abc import Generator, Sequence
from contextlib import closing, contextmanager
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

FloatVector = NDArray[np.float32]
SCHEMA_VERSION = 3


def encode_vector(values: Sequence[float]) -> bytes:
    if not 1 <= len(values) <= 4096 or any(not math.isfinite(x) for x in values):
        raise ValueError("Invalid vector dimension/values")
    with np.errstate(over="raise", invalid="raise"):
        vector = np.asarray(values, dtype="<f4")
    return vector.tobytes()


def decode_vector(blob: bytes, dimension: int) -> FloatVector:
    if not isinstance(blob, bytes) or not 1 <= dimension <= 4096 or len(blob) != dimension * 4:
        raise ValueError("Corrupt float32 vector")
    result = np.frombuffer(blob, dtype="<f4")
    if not np.isfinite(result).all():
        raise ValueError("Non-finite vector")
    return result


def legacy_vector(raw: str) -> list[float]:
    value: object = json.loads(raw)
    if not isinstance(value, list) or any(
        isinstance(x, bool) or not isinstance(x, (int, float)) for x in value
    ):
        raise ValueError("Invalid legacy vector")
    return [float(x) for x in value]


def index_path() -> Path:
    return (
        Path(
            os.getenv(
                "SCRIPTORIUM_PIPELINE_DATA", str(Path.home() / ".scriptorium" / "semantic-index")
            )
        )
        / "candidates.sqlite"
    )


def migrate(db: sqlite3.Connection, path: Path) -> None:
    version = db.execute("PRAGMA user_version").fetchone()[0]
    if version not in (0, 1, 2, SCHEMA_VERSION):
        raise ValueError("Índice local em versão incompatível.")
    if version == SCHEMA_VERSION:
        return
    db.execute("BEGIN IMMEDIATE")
    try:
        # Recheck after acquiring the SQLite writer lock; another process may have migrated.
        locked_version = db.execute("PRAGMA user_version").fetchone()[0]
        if locked_version not in (0, 1, 2, SCHEMA_VERSION):
            raise ValueError("Índice local em versão incompatível.")
        if locked_version == SCHEMA_VERSION:
            db.commit()
            return
        existing = {
            row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
        if "candidates" in existing:
            # Separate read connection sees the committed pre-migration snapshot, even in WAL.
            backup = path.with_name(f"{path.name}.before-v3-{time.time_ns()}")
            with (
                closing(sqlite3.connect(path)) as source,
                closing(sqlite3.connect(backup)) as target,
            ):
                source.backup(target)
                target.execute("PRAGMA journal_mode=DELETE")
        db.execute(
            "CREATE TABLE IF NOT EXISTS candidates(id TEXT PRIMARY KEY,edition TEXT NOT NULL,"
            "payload TEXT NOT NULL,checksum TEXT NOT NULL)"
        )
        db.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS candidate_fts USING fts5("
            "id UNINDEXED,edition UNINDEXED,text,tokenize='unicode61 remove_diacritics 2')"
        )
        legacy = [
            table for table in ["embedding_cache", "candidate_embeddings"] if table in existing
        ]
        for table in legacy:
            db.execute(f"ALTER TABLE {table} RENAME TO {table}_v2")
        # executescript would implicitly commit; individual statements keep rollback atomic.
        sql = (Path(__file__).parent / "migrations" / "003_float32_vectors.sql").read_text(
            encoding="utf-8"
        )
        for statement in sql.split(";"):
            if statement.strip():
                db.execute(statement)
        for table in legacy:
            cursor = db.execute(f"SELECT * FROM {table}_v2")
            columns = [column[0] for column in cursor.description]
            vector_index = columns.index("vector")
            for row in cursor:
                values = list(row)
                vector = legacy_vector(values[vector_index])
                values[vector_index] = encode_vector(vector)
                values.append(len(vector))
                db.execute(f"INSERT INTO {table} VALUES({','.join('?' for _ in values)})", values)
            db.execute(f"DROP TABLE {table}_v2")
        db.execute(f"PRAGMA user_version={SCHEMA_VERSION}")
        db.commit()
    except BaseException:
        db.rollback()
        raise


@contextmanager
def database() -> Generator[sqlite3.Connection, None, None]:
    path = index_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=30)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA foreign_keys=ON")
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        if version not in (0, 1, 2, SCHEMA_VERSION):
            raise ValueError("Índice local em versão incompatível.")
        connection.execute("PRAGMA journal_mode=WAL")
        migrate(connection, path)
        with connection:
            yield connection
    finally:
        connection.close()
