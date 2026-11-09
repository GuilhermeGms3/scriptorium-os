# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.3.3", "onnxruntime==1.23.2", "tokenizers==0.22.1", "safetensors==0.6.2"]
# ///
"""PC-only materialized retrieval index. No claims, interpretations or publication decisions."""

from __future__ import annotations

import argparse
import hashlib
import heapq
import json
import sqlite3
import time
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from safetensors.numpy import load_file
from tokenizers import Tokenizer

REVISION = "cad454171d918d9873a2701ba245054b6c1760dd"
MODEL_SHA = "1724c10ba3b33b58afb6ce73bbf3e0528921bd4d4e1bf5a569b6d73f234e72bf"
BASE = f"https://huggingface.co/Xenova/distiluse-base-multilingual-cased-v2/resolve/{REVISION}"
RECIPE = "distiluse-onnx-dense-tanh-l2-96-v2"
DENSE_REVISION = "bfe45d0732ca50787611c0fe107ba278c7f3f889"
DENSE_SHA = "0a21b1ce908e772ebf09f93c20ca09524c32706e9918d9c0169a3f0663b191ed"


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def download(
    output: Path, remote: str, checksum: str | None = None, base: str = BASE
) -> None:
    if output.exists() and (checksum is None or digest(output) == checksum):
        return
    temporary = output.with_suffix(output.suffix + ".download")
    with (
        urllib.request.urlopen(f"{base}/{remote}", timeout=120) as response,
        temporary.open("wb") as stream,
    ):
        while block := response.read(1024 * 1024):
            stream.write(block)
    if checksum and digest(temporary) != checksum:
        raise ValueError("Downloaded ONNX artifact failed its pinned SHA-256.")
    temporary.replace(output)


def main() -> None:
    args = argparse.ArgumentParser()
    args.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    args.add_argument("--output", type=Path, required=True)
    args.add_argument(
        "--editions",
        default="biblia-livre-n4-2025.1.0,biblia-portuguesa-mundial-2026-08-19",
    )
    args.add_argument("--limit", type=int)
    args.add_argument("--threads", type=int, default=4)
    args.add_argument("--batch-size", type=int, default=32)
    args.add_argument(
        "--query", help="Read-only relevance QA against an existing materialized index"
    )
    args.add_argument("--top", type=int, default=10)
    options = args.parse_args()
    output = options.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    print("Conferindo modelo ONNX fixado por revisão e SHA-256…", flush=True)
    download(output / "model.onnx", "onnx/model_quantized.onnx", MODEL_SHA)
    download(output / "tokenizer.json", "tokenizer.json")
    download(output / "vocab.txt", "vocab.txt")
    download(
        output / "dense.safetensors",
        "2_Dense/model.safetensors",
        DENSE_SHA,
        f"https://huggingface.co/sentence-transformers/distiluse-base-multilingual-cased-v2/resolve/{DENSE_REVISION}",
    )
    dense = load_file(output / "dense.safetensors")
    weight, bias = dense["linear.weight"], dense["linear.bias"]
    if weight.shape != (512, 768) or bias.shape != (512,):
        raise ValueError("Unexpected sentence embedding projection dimensions")
    dense_bytes = weight.astype("<f4").tobytes() + bias.astype("<f4").tobytes()
    if (
        not (output / "dense.f32").exists()
        or (output / "dense.f32").read_bytes() != dense_bytes
    ):
        (output / "dense.f32").write_bytes(dense_bytes)
    tokenizer = Tokenizer.from_file(str(output / "tokenizer.json"))
    tokenizer.enable_truncation(max_length=96)
    tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")
    settings = ort.SessionOptions()
    if not 1 <= options.threads <= 16 or not 1 <= options.batch_size <= 128:
        raise ValueError("Invalid inference batch/thread limits")
    settings.intra_op_num_threads = options.threads
    settings.inter_op_num_threads = 1
    session = ort.InferenceSession(
        str(output / "model.onnx"),
        sess_options=settings,
        providers=["CPUExecutionProvider"],
    )
    inputs = {item.name for item in session.get_inputs()}
    print(
        f"Entradas: {sorted(inputs)}; saídas: {[item.name for item in session.get_outputs()]}",
        flush=True,
    )

    def embed(texts: list[str]) -> np.ndarray:
        encoded = tokenizer.encode_batch(texts)
        ids = np.array([item.ids for item in encoded], dtype=np.int64)
        mask = np.array([item.attention_mask for item in encoded], dtype=np.int64)
        feed = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in inputs:
            feed["token_type_ids"] = np.zeros_like(ids)
        values = session.run(None, feed)[0]
        if values.ndim == 3:
            values = (values * mask[..., None]).sum(axis=1) / np.maximum(
                mask.sum(axis=1, keepdims=True), 1
            )
        values = np.tanh(values.astype(np.float32) @ weight.T + bias)
        values = values / np.maximum(
            np.linalg.norm(values, axis=1, keepdims=True), 1e-12
        )
        return values.astype("<f4")

    if options.query:
        query_vector = embed([options.query])[0]

        def relevance(blob: bytes) -> float:
            return float(np.dot(query_vector, np.frombuffer(blob, dtype="<f4")))

        path = output / "index.sqlite3"
        with sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True) as database:
            rows = database.execute(
                "SELECT unit_id,book_id,chapter,verse_start,vector FROM vectors WHERE edition_id=?",
                (options.editions.split(",")[0],),
            )
            if not 1 <= options.top <= 100:
                raise ValueError("Invalid result limit")
            best = heapq.nlargest(
                options.top,
                ((relevance(row[4]), row[0], row[1], row[2], row[3]) for row in rows),
            )
            print(json.dumps(best, ensure_ascii=False), flush=True)
        return

    probes = [
        "perdoar os inimigos",
        "No princípio criou Deus os céus e a terra.",
        "λόγος",
        "בְּרֵאשִׁית",
        "Jesus disse: amai os vossos inimigos.",
    ]
    examples = [
        {"text": text, "ids": tokenizer.encode(text).ids, "vector": vector.tolist()}
        for text, vector in zip(probes, embed(probes), strict=True)
    ]
    index = sqlite3.connect(output / "index.sqlite3")
    index.execute("PRAGMA user_version=1")
    index.execute(
        "CREATE TABLE IF NOT EXISTS vectors(unit_id TEXT PRIMARY KEY,edition_id TEXT NOT NULL,work_id TEXT NOT NULL,book_id TEXT NOT NULL,chapter INTEGER NOT NULL,verse_start INTEGER NOT NULL,scheme TEXT NOT NULL,text_checksum TEXT NOT NULL,vector BLOB NOT NULL)"
    )
    index.execute("CREATE INDEX IF NOT EXISTS vector_edition ON vectors(edition_id)")
    index.execute(
        "CREATE TABLE IF NOT EXISTS index_recipe(id INTEGER PRIMARY KEY CHECK(id=1),signature TEXT NOT NULL)"
    )
    signature = json.dumps(
        {
            "recipe": RECIPE,
            "model": MODEL_SHA,
            "dense": DENSE_SHA,
            "vocab": digest(output / "vocab.txt"),
            "tokenizer": digest(output / "tokenizer.json"),
        },
        sort_keys=True,
    )
    saved = index.execute("SELECT signature FROM index_recipe WHERE id=1").fetchone()
    if saved and saved[0] != signature:
        raise ValueError(
            "Index recipe changed. Generate a new output directory; do not mix vector models."
        )
    if not saved and index.execute("SELECT 1 FROM vectors LIMIT 1").fetchone():
        # Compatible with an index generated before recipe metadata was introduced.
        previous = json.loads((output / "config.json").read_text(encoding="utf-8"))
        if previous.get("recipe") != RECIPE or previous.get("sha256") != MODEL_SHA:
            raise ValueError(
                "Existing index has no compatible provenance; use a new directory."
            )
    index.execute("INSERT OR IGNORE INTO index_recipe VALUES(1,?)", (signature,))
    index.commit()
    editions = options.editions.split(",")
    processed = 0
    started = time.monotonic()
    for edition in editions:
        # Whitelisted generated file names, never arbitrary user-provided SQL or remote URLs.
        if any(
            character not in "abcdefghijklmnopqrstuvwxyz0123456789-."
            for character in edition
        ):
            raise ValueError("Invalid edition identifier")
        path = options.root / "public" / "corpus-packages" / f"{edition}.sqlite3"
        source = sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)
        rows = source.execute(
            "SELECT t.id,t.work_id,a.book_id,a.chapter,a.verse_start,a.versification_scheme_id,t.surface_text FROM text_units t JOIN text_addresses a ON a.text_unit_id=t.id WHERE t.edition_id=? AND a.versification_scheme_id='scriptorium-bcv-1' AND a.chapter IS NOT NULL ORDER BY t.sequence",
            (edition,),
        )
        batch: list[tuple] = []

        def flush(current_edition: str = edition) -> None:
            nonlocal processed, batch
            if not batch:
                return
            vectors = embed([row[6] for row in batch])
            for row, vector in zip(batch, vectors, strict=True):
                index.execute(
                    "INSERT OR REPLACE INTO vectors VALUES(?,?,?,?,?,?,?,?,?)",
                    (
                        row[0],
                        current_edition,
                        row[1],
                        row[2],
                        row[3],
                        row[4],
                        row[5],
                        hashlib.sha256(row[6].encode()).hexdigest(),
                        vector.tobytes(),
                    ),
                )
            index.commit()
            processed += len(batch)
            if processed // 256 != (processed - len(batch)) // 256:
                print(
                    f"{current_edition}: {processed} novas unidades · {time.monotonic() - started:.0f}s",
                    flush=True,
                )
            batch = []

        for row in rows:
            if options.limit is not None and processed + len(batch) >= options.limit:
                break
            checksum = hashlib.sha256(row[6].encode()).hexdigest()
            old = index.execute(
                "SELECT text_checksum FROM vectors WHERE unit_id=?", (row[0],)
            ).fetchone()
            if old and old[0] == checksum:
                continue
            batch.append(row)
            if len(batch) == options.batch_size:
                flush()
        flush()
        source.close()
    counts = dict(
        index.execute("SELECT edition_id,count(*) FROM vectors GROUP BY edition_id")
    )
    metadata = {
        "recipe": RECIPE,
        "model": "Xenova/distiluse-base-multilingual-cased-v2",
        "revision": REVISION,
        "sha256": MODEL_SHA,
        "denseRevision": DENSE_REVISION,
        "denseSourceSha256": DENSE_SHA,
        "denseSha256": digest(output / "dense.f32"),
        "license": "Apache-2.0 (base sentence-transformers model)",
        "dimension": len(examples[0]["vector"]),
        "maxTokens": 96,
        "counts": counts,
        "tokenizerSha256": digest(output / "tokenizer.json"),
        "vocabSha256": digest(output / "vocab.txt"),
        "probes": examples,
    }
    (output / "config.json").write_text(
        json.dumps(metadata, ensure_ascii=False), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "counts": counts,
                "dimension": metadata["dimension"],
                "seconds": round(time.monotonic() - started, 1),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    index.close()


if __name__ == "__main__":
    main()
