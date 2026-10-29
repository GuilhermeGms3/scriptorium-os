"""Offline staging/report CLI. SQLite writes belong exclusively to the TS importer."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

from app.commentary_extractor import Profile, Snapshot, batch_id, extract


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("profile", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--pdf", type=Path)
    parser.add_argument("--layout", type=Path)
    args = parser.parse_args()
    raw = args.snapshot.read_bytes()
    snapshot = Snapshot.model_validate_json(raw)
    profile = Profile.model_validate_json(args.profile.read_bytes())
    bold_prefixes: dict[int, list[str]] | None = None
    if profile.markerStyle == "bold-font":
        if not args.pdf:
            raise ValueError("--pdf is required to verify original font/layout evidence")
        from app.commentary_pdf import bold_markers

        bold_prefixes = bold_markers(args.pdf, snapshot.checksum)
    if profile.layout == "notes-only":
        result = extract(snapshot, profile, bold_prefixes)
    else:
        if not args.layout:
            raise ValueError("--layout required for structured commentary")
        from app.commentary_structured import extract_structured

        result = extract_structured(snapshot, profile, args.layout, args.pdf)
    args.output.mkdir(parents=True, exist_ok=True)
    created = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    files: list[dict[str, object]] = []
    for start in range(0, len(result.notes), 100):
        notes = result.notes[start : start + 100]
        identifier = batch_id(snapshot.checksum, notes, result.version)
        package = {
            "format": "scriptorium-contextual-reading-v1",
            "batchId": identifier,
            "analyst": f"deterministic-{result.version}",
            "createdAt": created,
            "coverage": f"Extração {profile.layout} da fonte {snapshot.checksum}; "
            "marcadores explícitos, sem inferência LLM; exceções no relatório privado.",
            "notes": notes,
        }
        data = json.dumps(package, ensure_ascii=False, indent=2).encode("utf-8")
        path = args.output / f"{start // 100:04d}-{identifier}.json"
        # Stable reruns: source evidence, not timestamps, defines the batch.
        if not path.exists():
            path.write_bytes(data)
        else:
            previous = json.loads(path.read_bytes())
            if previous["notes"] != notes:
                raise ValueError("Existing batch differs; use a new output directory")
            data = path.read_bytes()
        files.append(
            {"file": path.name, "sha256": hashlib.sha256(data).hexdigest(), "notes": len(notes)}
        )
    per_book = Counter(
        str(cast(dict[str, object], note["passage"])["bookId"]) for note in result.notes
    )
    report = {
        "format": "scriptorium-commentary-report-v1",
        "version": result.version,
        "sourceChecksum": snapshot.checksum,
        "snapshotChecksum": hashlib.sha256(raw).hexdigest(),
        "processedPages": result.processed_pages,
        "ignoredFrontMatterPages": result.ignored_pages,
        "protectedExistingNotes": result.protected,
        "extractedNotes": len(result.notes),
        "sections": result.sections,
        "notesPerBook": dict(per_book),
        "exceptions": result.exceptions,
        "exceptionCounts": dict(Counter(str(x["reason"]) for x in result.exceptions)),
        "publication": "staging-only",
        "files": files,
        "allBookHeadingsResolved": len(result.sections) == len(profile.bookIds or snapshot.books),
    }
    (args.output / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {k: v for k, v in report.items() if k not in {"exceptions", "sections", "files"}},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
