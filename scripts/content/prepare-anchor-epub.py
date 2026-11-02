"""Private, deterministic EPUB text derivative for the existing PDF-backed library reader.

One XHTML spine item becomes one labelled derivative page; these are NOT printed pages.
Original EPUB and checksum are retained separately. No scripts/links from the EPUB execute.
Requires reportlab in the selected local Python runtime.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path, PurePosixPath

sys.path.insert(
    0, str(Path(__file__).resolve().parents[2] / "services/semantic-engine")
)
from app.epub_text import epub_body_text
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

EXPECTED = "ea4f4516b18ca1c90a7e26203cdd38820ca59ac03bc740efe567b10b5c61a4a0"


def prepare(source: Path, output: Path, font: Path) -> None:
    with source.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != EXPECTED:
            raise ValueError("Uncalibrated Anchor EPUB edition")
    output.mkdir(parents=True, exist_ok=True)
    pdf_path = output / "anchor-private-derivative.pdf"
    if pdf_path.exists():
        raise FileExistsError("Derivative already exists; verify or reuse its manifest")
    pdfmetrics.registerFont(TTFont("ReaderUnicode", str(font)))
    canvas = Canvas(str(pdf_path), pageCompression=1, invariant=1)
    canvas.setTitle("Anchor Bible Dictionary — derivado textual do EPUB privado")
    pages = []
    with zipfile.ZipFile(source) as archive:
        if sum(i.file_size for i in archive.infolist()) > 512 * 1024 * 1024:
            raise ValueError("EPUB uncompressed limit")
        container = ET.fromstring(archive.read("META-INF/container.xml"))
        opf = next(
            e.attrib["full-path"]
            for e in container.iter()
            if e.tag.endswith("rootfile")
        )
        package = ET.fromstring(archive.read(opf))
        manifest = {
            e.attrib["id"]: e.attrib for e in package.iter() if e.tag.endswith("item")
        }
        references = [
            e.attrib["idref"] for e in package.iter() if e.tag.endswith("itemref")
        ]
        missing = [ref for ref in references if ref not in manifest]
        if any(ref != "cover" for ref in missing):
            raise ValueError("Unresolved EPUB spine references: " + str(missing))
        # This exact EPUB references an absent cover item. Record it, never synthesize content.
        spine = [manifest[ref] for ref in references if ref in manifest]
        for position, item in enumerate(spine):
            path = PurePosixPath(opf).parent / item["href"]
            if path.is_absolute() or ".." in path.parts:
                raise ValueError("EPUB path traversal")
            text = epub_body_text(archive.read(str(path)).decode("utf-8"))
            if not text:
                text = "[Item sem texto recuperável no EPUB]"
            label = f"EPUB item {position + 1} · {item['href']} (não é página impressa)"
            lines = []
            for paragraph in text.splitlines():
                line = ""
                for word in paragraph.split():
                    candidate = (line + " " + word).strip()
                    if (
                        line
                        and pdfmetrics.stringWidth(candidate, "ReaderUnicode", 9) > 515
                    ):
                        lines.append(line)
                        line = word
                    else:
                        line = candidate
                lines.append(line)
            height = max(842, 70 + 12 * len(lines))
            if height > 14400:
                raise ValueError("EPUB item exceeds derivative page height limit")
            canvas.setPageSize((595, height))
            canvas.setFont("ReaderUnicode", 8)
            canvas.drawString(35, height - 25, label[:120])
            canvas.setFont("ReaderUnicode", 9)
            for n, line in enumerate(lines):
                canvas.drawString(35, height - 45 - 12 * n, line)
            canvas.showPage()
            pages.append(
                {
                    "pageIndex": position,
                    "pageLabel": label,
                    "text": text,
                    "itemCount": len(lines),
                }
            )
            if position % 1000 == 0:
                print("EPUB", position + 1, "/", len(spine), flush=True)
    canvas.save()
    checksum = hashlib.file_digest(pdf_path.open("rb"), "sha256").hexdigest()
    document = {
        "title": "Anchor Bible Dictionary — seis volumes (EPUB; derivado textual)",
        "language": "en",
        "originalName": pdf_path.name,
        "mimeType": "application/pdf",
        "sizeBytes": pdf_path.stat().st_size,
        "checksum": checksum,
        "pageCount": len(pages),
        "textPageCount": len(pages),
        "extractionMethod": "pdf-text-layer",
        "pages": pages,
    }
    (output / "document.json").write_text(
        json.dumps(document, ensure_ascii=False), encoding="utf-8"
    )
    (output / "derivation.json").write_text(
        json.dumps(
            {
                "sourceChecksum": EXPECTED,
                "source": str(source.resolve()),
                "derivativeChecksum": checksum,
                "derivative": str(pdf_path.resolve()),
                "recipe": "epub-spine-text-v1",
                "missingSpineItems": missing,
                "pageMeaning": "One XHTML spine item, not printed pagination",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "items": len(pages),
                "checksum": checksum,
                "bytes": pdf_path.stat().st_size,
            }
        )
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--font", type=Path, required=True)
    a = p.parse_args()
    prepare(a.source, a.output, a.font)
