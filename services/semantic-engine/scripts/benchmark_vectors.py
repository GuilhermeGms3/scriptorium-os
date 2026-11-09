"""Reproducible synthetic serialization/read benchmark; never opens the private library."""

import json
import sqlite3
import tempfile
import time
from contextlib import closing
from pathlib import Path

import numpy as np


def main():
    count, dimensions = 10000, 768
    vectors = np.random.default_rng(42).normal(size=(count, dimensions)).astype("<f4")
    measurements = {}
    with tempfile.TemporaryDirectory(prefix="scriptorium-vectors-") as directory:
        for kind in ["json", "blob"]:
            path = Path(directory) / f"{kind}.sqlite"
            started = time.perf_counter()
            with closing(sqlite3.connect(path)) as db:
                column_type = "TEXT" if kind == "json" else "BLOB"
                db.execute(f"CREATE TABLE vectors(id INTEGER PRIMARY KEY,vector {column_type})")
                db.executemany(
                    "INSERT INTO vectors(vector) VALUES(?)",
                    (
                        (json.dumps(vector.tolist()) if kind == "json" else vector.tobytes(),)
                        for vector in vectors
                    ),
                )
                db.commit()
                write_ms = (time.perf_counter() - started) * 1000
                started = time.perf_counter()
                loaded = np.stack(
                    [
                        np.asarray(json.loads(row[0]), dtype=np.float32)
                        if kind == "json"
                        else np.frombuffer(row[0], dtype="<f4")
                        for row in db.execute("SELECT vector FROM vectors ORDER BY id")
                    ]
                )
                read_ms = (time.perf_counter() - started) * 1000
                np.testing.assert_array_equal(loaded, vectors)
                started = time.perf_counter()
                scores = loaded @ vectors[0]
                query_ms = (time.perf_counter() - started) * 1000
                assert np.isfinite(scores).all()
            measurements[kind] = {
                "databaseBytes": path.stat().st_size,
                "writeMs": round(write_ms, 2),
                "readDecodeMs": round(read_ms, 2),
                "numpyDotMs": round(query_ms, 2),
            }
    print(
        json.dumps(
            {"vectors": count, "dimensions": dimensions, "seed": 42, "measurements": measurements},
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
