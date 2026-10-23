"""Resumable offline OCR staging; never writes the canonical workspace or modifies a PDF."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from .local_pipeline import ocr
from .pipeline_contracts import OcrRequest, OcrResponse


class Target(BaseModel):
    checksum: str = Field(pattern=r"^[a-f0-9]{64}$")
    title: str
    pages: int = Field(gt=0, le=5000)
    language: str = Field(pattern=r"^[a-z]{3}(?:\+[a-z]{3}){0,2}$")


class Manifest(BaseModel):
    format: Literal["scriptorium-ocr-library-v1"] = "scriptorium-ocr-library-v1"
    targets: list[Target] = Field(max_length=100)
    modelRevision: str = Field(min_length=1, max_length=200)


def digest(path: Path) -> str:
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def atomic_json(path: Path, value: object) -> None:
    temporary = path.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as output:
        json.dump(value, output, ensure_ascii=False)
        output.flush()
        os.fsync(output.fileno())
    temporary.replace(path)


def language(title: str) -> str:
    return "spa+eng" if "keener" in title.lower() or "lossky" in title.lower() else "por+eng"


def page_result(checksum: str, page: int, response: OcrResponse) -> dict[str, object]:
    text = response.text
    length = len(text.encode("utf-16-le")) // 2
    previous = 0
    for block in response.blocks:
        if (
            block.startOffset < previous
            or block.endOffset <= block.startOffset
            or block.endOffset > length
            or block.bbox[2] < block.bbox[0]
            or block.bbox[3] < block.bbox[1]
        ):
            raise ValueError("Invalid OCR layout; page not staged")
        previous = block.endOffset
    return {
        "format": "scriptorium-ocr-page-v1",
        "sourceChecksum": checksum,
        "physicalPage": page,
        "textChecksum": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "result": response.model_dump(mode="json"),
    }


def run(workspace: Path, destination: Path, sample: bool) -> None:
    poppler = shutil.which(os.environ.get("SCRIPTORIUM_PDFTOPPM", "pdftoppm"))
    tesseract = shutil.which(os.environ.get("SCRIPTORIUM_TESSERACT", "tesseract"))
    if not poppler or not tesseract:
        raise ValueError("Configure pdftoppm and Tesseract before staging")
    destination.mkdir(parents=True, exist_ok=True)
    lock = destination / "worker.lock"
    # No stale lock takeover: an interrupted worker requires explicit operator inspection.
    with lock.open("x", encoding="ascii") as handle:
        handle.write(str(os.getpid()))
    try:
        with sqlite3.connect(workspace.resolve().as_uri() + "?mode=ro", uri=True) as db:
            manifest_path = destination / "manifest.json"
            if manifest_path.exists():
                manifest = Manifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
            else:
                rows = db.execute(
                    "SELECT checksum,title,page_count FROM private_documents "
                    "WHERE text_page_count=0"
                ).fetchall()
                manifest = Manifest(
                    targets=[
                        Target(checksum=c, title=t, pages=p, language=language(t))
                        for c, t, p in rows
                    ],
                    modelRevision=os.environ.get(
                        "SCRIPTORIUM_TESSDATA_REVISION", "operator-unspecified"
                    ),
                )
                atomic_json(manifest_path, manifest.model_dump())
            errors: list[dict[str, object]] = []
            completed = 0
            reused = 0
            for target in manifest.targets:
                pdf = workspace.parent / "documents" / f"{target.checksum}.pdf"
                if pdf.resolve().parent != (workspace.parent / "documents").resolve():
                    raise ValueError("Original outside the canonical documents directory")
                if digest(pdf) != target.checksum:
                    raise ValueError("Original checksum mismatch")
                document = db.execute(
                    "SELECT id,page_count FROM private_documents WHERE checksum=?",
                    (target.checksum,),
                ).fetchone()
                if not document or document[1] != target.pages:
                    raise ValueError("Edition or page count changed")
                pages = db.execute(
                    "SELECT page_index FROM private_document_pages "
                    "WHERE document_id=? AND text='' ORDER BY page_index",
                    (document[0],),
                ).fetchall()
                selected = {min(5, target.pages), min(20, target.pages), min(50, target.pages)}
                for (index,) in pages:
                    page = int(index) + 1
                    if sample and page not in selected:
                        continue
                    output = destination / f"{target.checksum}-{page:05d}.json"
                    if output.exists():
                        staged = json.loads(output.read_text(encoding="utf-8"))
                        if not str(staged["result"]["revision"]).endswith(";tsv-literal-v1"):
                            raise ValueError("Old OCR recipe; stage again in a new directory")
                        expected = page_result(
                            target.checksum, page, OcrResponse.model_validate(staged["result"])
                        )
                        if staged != expected:
                            raise ValueError("Staged page changed; refusing reuse")
                        reused += 1
                        continue
                    try:
                        with tempfile.TemporaryDirectory(prefix="scriptorium-ocr-page-") as folder:
                            prefix = Path(folder) / "page"
                            subprocess.run(
                                [
                                    poppler,
                                    "-f",
                                    str(page),
                                    "-l",
                                    str(page),
                                    "-singlefile",
                                    "-scale-to",
                                    "3500",
                                    "-gray",
                                    "-png",
                                    str(pdf),
                                    str(prefix),
                                ],
                                capture_output=True,
                                check=True,
                                timeout=120,
                            )
                            image = prefix.with_suffix(".png")
                            response = OcrResponse.model_validate(
                                ocr(
                                    OcrRequest(
                                        imageBase64=base64.b64encode(image.read_bytes()).decode(
                                            "ascii"
                                        ),
                                        language=target.language,
                                    )
                                )
                            )
                            atomic_json(output, page_result(target.checksum, page, response))
                            if sample:
                                previews = destination / "previews"
                                previews.mkdir(exist_ok=True)
                                shutil.copyfile(
                                    image, previews / f"{target.checksum[:12]}-{page}.png"
                                )
                        completed += 1
                        print(
                            json.dumps(
                                {
                                    "title": target.title,
                                    "page": page,
                                    "total": target.pages,
                                    "characters": len(response.text),
                                }
                            ),
                            flush=True,
                        )
                    except Exception as error:
                        errors.append(
                            {
                                "checksum": target.checksum,
                                "page": page,
                                "error": type(error).__name__,
                            }
                        )
                        print(json.dumps(errors[-1]), flush=True)
                    atomic_json(
                        destination / "progress.json",
                        {
                            "completed": completed,
                            "reused": reused,
                            "errors": errors,
                            "sample": sample,
                        },
                    )
            print(
                json.dumps(
                    {
                        "completed": completed,
                        "reused": reused,
                        "errors": len(errors),
                        "sample": sample,
                    }
                ),
                flush=True,
            )
            if errors:
                raise RuntimeError("Some pages failed; staged successes remain resumable")
    finally:
        lock.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--sample", action="store_true")
    args = parser.parse_args()
    run(args.workspace, args.destination, args.sample)


if __name__ == "__main__":
    main()
