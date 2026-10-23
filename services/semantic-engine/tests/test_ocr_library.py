import base64
import hashlib
import sqlite3
import subprocess
from pathlib import Path

import pytest

from app import local_pipeline, ocr_library
from app.ocr_library import atomic_json, language, page_result
from app.pipeline_contracts import LayoutBlock, OcrRequest, OcrResponse


def test_layout_uses_utf16_and_preserves_an_empty_attempt() -> None:
    text = "😀 Palavra"
    response = OcrResponse(
        text=text,
        blocks=[LayoutBlock(startOffset=0, endOffset=10, bbox=(0, 0, 1, 1), kind="line")],
        method="fixture",
        revision="1",
    )
    assert (
        page_result("a" * 64, 1, response)["textChecksum"]
        == hashlib.sha256(text.encode()).hexdigest()
    )
    response.blocks[0].endOffset = 11
    with pytest.raises(ValueError):
        page_result("a" * 64, 1, response)
    assert page_result(
        "a" * 64, 2, OcrResponse(text="", blocks=[], method="fixture", revision="1")
    )["result"]


def test_language_comes_from_document_profile_and_atomic_receipt(tmp_path: Path) -> None:
    assert language("Craig Keener") == "spa+eng"
    assert language("Vladimir Lossky") == "spa+eng"
    assert language("Wegner") == "por+eng"
    atomic_json(tmp_path / "page.json", {"page": 1})
    assert (tmp_path / "page.json").read_text() == '{"page": 1}'
    assert not (tmp_path / "page.tmp").exists()


def test_atomic_replace_retries_windows_sharing_violation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    target = tmp_path / "progress.json"
    target.write_text('{"old":true}')
    replace = Path.replace
    attempts = 0

    def locked_once(path: Path, destination: Path) -> Path:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            assert target.read_text() == '{"old":true}'
            raise PermissionError("Windows sharing violation")
        return replace(path, destination)

    monkeypatch.setattr(Path, "replace", locked_once)
    monkeypatch.setattr(ocr_library.time, "sleep", lambda _: None)
    atomic_json(target, {"completed": 1})
    assert attempts == 3
    assert target.read_text() == '{"completed": 1}'
    assert not list(tmp_path.glob("*.tmp"))


def test_progress_lock_does_not_abort_page_recovery(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def denied(path: Path, destination: Path) -> Path:
        raise PermissionError("Locked by another reader")

    monkeypatch.setattr(Path, "replace", denied)
    monkeypatch.setattr(ocr_library.time, "sleep", lambda _: None)
    ocr_library.write_progress(tmp_path / "progress.json", {"completed": 2})
    assert not list(tmp_path.glob("*.tmp"))
    with pytest.raises(PermissionError):
        atomic_json(tmp_path / "page.json", {"result": "must not silently disappear"})


def test_real_ocr_parser_requests_orientation_and_returns_original_image_coordinates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(local_pipeline.shutil, "which", lambda _: "fixture-tesseract")

    def execute(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
        if args[-1] == "--version":
            return subprocess.CompletedProcess(args, 0, b"tesseract fixture", b"")
        assert args[-3:] == ["--psm", "1", "tsv"]
        data = (
            "level\tblock_num\tpar_num\tline_num\ttext\tleft\ttop\twidth\theight\n"
            '5\t1\t1\t1\t"\t2\t20\t5\t10\n'
            "5\t1\t1\t1\tPalavra\t10\t20\t30\t10\n"
        )
        return subprocess.CompletedProcess(args, 0, data.encode(), b"")

    monkeypatch.setattr(local_pipeline.subprocess, "run", execute)
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8 + (100).to_bytes(4) + (200).to_bytes(4)
    result = OcrResponse.model_validate(
        local_pipeline.ocr(OcrRequest(imageBase64=base64.b64encode(png).decode()))
    )
    assert result.text == '" Palavra'
    assert result.revision.endswith(";psm=1;tsv-literal-v1")
    assert result.blocks[0].bbox == (0.02, 0.1, 0.4, 0.15)


def test_worker_stages_once_resumes_and_refuses_changed_original(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    content = b"%PDF-synthetic-fixture-not-a-real-book"
    checksum = hashlib.sha256(content).hexdigest()
    documents = tmp_path / "documents"
    documents.mkdir()
    original = documents / f"{checksum}.pdf"
    original.write_bytes(content)
    workspace = tmp_path / "workspace.sqlite3"
    with sqlite3.connect(workspace) as db:
        db.executescript(
            "CREATE TABLE private_documents(id TEXT,checksum TEXT,title TEXT,"
            "page_count INTEGER,text_page_count INTEGER);"
            "CREATE TABLE private_document_pages(document_id TEXT,page_index INTEGER,text TEXT);"
        )
        db.execute(
            "INSERT INTO private_documents VALUES('doc',?,'Wegner fixture',1,0)", (checksum,)
        )
        db.execute("INSERT INTO private_document_pages VALUES('doc',0,'')")
    monkeypatch.setattr(ocr_library.shutil, "which", lambda _: "fixture")
    calls: list[list[str]] = []

    def render(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
        calls.append(args)
        Path(args[-1]).with_suffix(".png").write_bytes(b"synthetic-render-fixture")
        return subprocess.CompletedProcess(args, 0, b"", b"")

    monkeypatch.setattr(ocr_library.subprocess, "run", render)
    response = OcrResponse(
        text="Fixture",
        blocks=[LayoutBlock(startOffset=0, endOffset=7, bbox=(0, 0, 1, 1), kind="line")],
        method="tesseract-tsv",
        revision="fixture;psm=1;tsv-literal-v1",
    )
    monkeypatch.setattr(ocr_library, "ocr", lambda _: response.model_dump())
    destination = tmp_path / "staging"
    ocr_library.run(workspace, destination, False)
    ocr_library.run(workspace, destination, False)
    assert len(calls) == 1
    assert not (destination / "worker.lock").exists()
    with sqlite3.connect(workspace) as db:
        assert db.execute("SELECT text FROM private_document_pages").fetchone() == ("",)
    original.write_bytes(b"changed")
    with pytest.raises(ValueError, match="checksum"):
        ocr_library.run(workspace, destination, False)
    assert not (destination / "worker.lock").exists()
