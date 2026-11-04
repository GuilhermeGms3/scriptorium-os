"""Read inert body text from EPUB HTML, including malformed OCR-produced XHTML."""

import re
from html.parser import HTMLParser


class BodyText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.body = False
        self.blocked = 0
        self.pieces: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "body":
            self.body = True
        if tag in {"script", "style", "iframe", "object"}:
            self.blocked += 1
        if tag in {"p", "div", "h1", "h2", "h3", "br"} and not self.blocked:
            self.pieces.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "iframe", "object"}:
            self.blocked = max(0, self.blocked - 1)
        if tag == "body":
            self.body = False

    def handle_data(self, data: str) -> None:
        if self.body and not self.blocked:
            self.pieces.append(data)


def epub_body_text(raw: str) -> str:
    parser = BodyText()
    parser.feed(raw)
    return "\n".join(
        value
        for line in "".join(parser.pieces).splitlines()
        if (value := re.sub(r"\s+", " ", line).strip())
    )
