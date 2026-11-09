"""Offline documentary segmentation. Never infers a biblical target or a doctrinal claim.

Reads the canonical extracted pages read-only; emits private, edition-pinned staging.
The TypeScript importer validates every UTF-16 span again before an additive publication.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path
from typing import Literal, TypedDict

Role = Literal["question", "objection", "counterpoint", "response", "reply", "section", "entry"]


class Fragment(TypedDict):
    physicalPage: int
    pageTextChecksum: str
    startOffset: int
    endOffset: int
    quote: str


class Context(TypedDict):
    topicIds: list[str]
    locator: str
    sectionPath: list[str]
    role: Role
    author: str
    tradition: str
    rationale: str
    limitations: list[str]


class Entry(TypedDict):
    domain: str
    context: Context
    fragments: list[Fragment]


def normalized(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text.lower()) if not unicodedata.combining(c)
    )


def digest(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


@dataclass(frozen=True)
class Page:
    number: int
    text: str


@dataclass(frozen=True)
class Profile:
    checksum: str
    author: str
    tradition: str
    first_page: int
    topics: tuple[str, ...]
    domain: str
    strategy: str = "sections"
    last_page: int = 100000
    heading_pattern: str = ""


# Edition identities, not mutable filenames. OCR-blocked books are reported separately.
PROFILES = (
    Profile(
        "bce9882610a0564144fdd1fb2ced480a1c25a30db48b4cbb004958d16034fbed",
        "Tomás de Aquino",
        "Escolástica católica",
        117,
        ("teologia",),
        "theology",
        "summa",
    ),
    Profile(
        "3ed58f0710ad11c27c26a4d1bc0f9dc9bd306c58baa659b4ca05436a87c725ff",
        "João Calvino",
        "Reformada",
        45,
        ("teologia",),
        "theology",
    ),
    Profile(
        "3a1ec505530e29550ac4d735a63d81854c6c75b548a1e9f19a93468e99fe063d",
        "João Calvino",
        "Reformada",
        37,
        ("teologia",),
        "theology",
    ),
    Profile(
        "17a34221d239025a27503c061c0ce69b5bf3da1c8b5e35767f0b56c4de05d332",
        "Catecismo da Igreja Católica",
        "Católica",
        10,
        ("teologia",),
        "theology",
        "catechism",
        367,
    ),
    Profile(
        "3e96a03b674d9c78acaf7e9d15608cf3ae56c1e9190b79777acde87cb77f11e6",
        "Assembleia de Westminster",
        "Reformada",
        1,
        ("historia-tradicoes", "teologia"),
        "tradition",
    ),
    Profile(
        "f6f4069eaadc0f2070a16665b4e70562df30d1ee7d93019496ad7bdf7d178351",
        "Confissão de Augsburgo",
        "Luterana",
        6,
        ("historia-tradicoes", "teologia"),
        "tradition",
    ),
    Profile(
        "6a07e12ae01058d6acaa0a33bd86bda47ba94c689a56173ec24af71905afae5d",
        "Kallistos Ware",
        "Ortodoxa",
        7,
        ("historia-tradicoes", "eclesiologia-liturgia"),
        "tradition",
        "sections",
        17,
        r"^Os primeiros seis concílios \(325-681\)\.$",
    ),
    Profile(
        "74684b5e9334d9864dc22d5c1d34310f649716858c9a828c949933f322384424",
        "Ivoni Richter Reimer e Haroldo Reimer",
        "Métodos e interpretação; perspectivas dos autores",
        13,
        ("hermeneutica-metodos", "exegese-recepcao"),
        "hermeneutics",
        "sections",
        245,
        r"^(?:À LUZ DA CRÍTICA HISTÓRICA:|A SINAGOGA DAS MULHERES:|"
        r"INEFÁVEL E SEM FORMA:|SÁBADO E VIDA DIGNA|VIVER EM RITMO MENOS ACELERADO:|"
        r"ESPIRITUALIDADE ECOLÓGICA NA BÍBLIA|ECOLOGIA EM PERSPECTIVA DE ESPIRITUALIDADE|"
        r"PROFECIA, DIREITO E JUSTIÇA:|O CUIDADO COM AS PESSOAS EMPOBRECIDAS NA|"
        r"A MALDADE DOS HOMENS MULTIPLICOU-SE SOBRE|MISERICÓRDIA QUERO!|"
        r"PODER COMO SERVIÇO:)[^\n]*$",
    ),
    Profile(
        "455fad64bb39d2f9ef1c1294f054f925d672334a06d4c51e2e96ebfbfb934227",
        "Agostinho de Hipona",
        "Patrística latina",
        30,
        ("patristica", "trindade-cristologia"),
        "patristics",
    ),
    Profile(
        "ccc86309e19e6768831560ae2404527bcec1fdda6c088056798f979a934d0325",
        "Agostinho de Hipona",
        "Patrística latina",
        40,
        ("patristica",),
        "patristics",
    ),
    Profile(
        "f2608d99259c06a66c895354d326615ab80c176f817e8cc095899e092fe841bf",
        "Flávio Josefo",
        "Fonte historiográfica antiga; tradução e OCR da edição",
        16,
        ("historia-tradicoes",),
        "historical-context",
    ),
    Profile(
        "f5ccbe126834afb0cdb4b9c474d116f4cbd9369120e496b325b718a86a5d1e13",
        "García Martínez e Tigchelaar (edição)",
        "Literatura judaica do Segundo Templo",
        26,
        ("literatura-fontes",),
        "historical-context",
    ),
    Profile(
        "91358c6c2120597d70f76a003f4bc343477d8e02d04f010575e65c26c1fd0315",
        "Autores antigos e editores da coleção",
        "Cristianismos antigos; introduções e traduções da edição",
        17,
        ("gnosticismo", "literatura-fontes"),
        "religious-currents",
    ),
    Profile(
        "d5a03d8b7995c7e1949a010d016fc277f97cfebb02f1a92b29c43d11d59646c3",
        "Autores antigos e editores da coleção",
        "Cristianismos antigos; introduções e traduções da edição",
        15,
        ("gnosticismo", "literatura-fontes"),
        "religious-currents",
    ),
    Profile(
        "518ff717f956b9e3c7e02caa8afb230cd2db1c787d71a9c4c21567597dca57a6",
        "Autores antigos e editores da coleção",
        "Cristianismos antigos; introduções e traduções da edição",
        15,
        ("gnosticismo", "literatura-fontes"),
        "religious-currents",
    ),
    Profile(
        "0c3bf6a9be8dbcb4c268266c2c6155dbfab6030201efb3b07872bc032cf4a30b",
        "Autores antigos e editores da coleção",
        "Cristianismos antigos; introduções e traduções da edição",
        15,
        ("gnosticismo", "literatura-fontes"),
        "religious-currents",
    ),
)

# Newly calibrated editions. Their output remains documentary, never verse commentary.
ADDITIONAL_PROFILES = (
    Profile(
        "26e7477dd8e304a91005ec45b4033e0938dcb23b3f554b4f5a47345f7fc6e6c9",
        "Agostinho de Hipona",
        "Patrística latina",
        1,
        ("patristica", "teologia"),
        "patristics",
        "confessions",
        197,
    ),
    Profile(
        "885a12227acbb6e755084b6d09945d4b59b172e3ca8c1e39b8191b28e6c8c5f7",
        "Autores e organizadores da edição instalada",
        "Posições da edição, não consenso universal",
        23,
        ("teologia",),
        "theology",
        "sections",
        744,
        r"^(?:DOUTRINA D[AE] [^\n]+|GEOGRAFIA BÍBLICA|ESCATOLO?GIA[^\n]*|"
        r"SÍNTESE DO [^\n]+|A INSPIRAÇÃO DAS ESCRITURAS|OS IDIOMAS ORIGINAIS DA BÍBLIA|"
        r"MANUSCRITOS|TRADUÇÕES DA BÍBLIA)[ \t]*$",
    ),
    Profile(
        "d52a56ca811f8e9667d8f6e7f95ad61c2b1e808c6f4e5bba06883bb912777368",
        "Autores dos capítulos; J. W. Rogerson e Judith M. Lieu (organização)",
        "Pesquisa acadêmica; posições dos respectivos autores",
        26,
        ("exegese-recepcao", "hermeneutica-metodos"),
        "exegesis",
        "oxford",
        868,
    ),
    Profile(
        "518ff717f956b9e3c7e02caa8afb230cd2db1c787d71a9c4c21567597dca57a6",
        "Autores antigos e editores da coleção",
        "Cristianismos antigos; tradução e introduções",
        11,
        ("gnosticismo", "literatura-fontes"),
        "religious-currents",
        "nag-tractates",
        278,
        r"^(?:EVANGELIO DE [A-ZÁÉÍÓÚÑ ]+|DIÁLOGO DEL SALVADOR|"
        r"SABIDURÍA DE JESUCRISTO|LIBRO DE TOMÁS[^\n]*)[ \t]*$",
    ),
)

# Only headings assign specific subjects. Body-word occurrences are not thematic evidence.
SUBJECTS = (
    (
        r"trindade|trinity|triune|processoes|pessoas divinas",
        ("trindade-cristologia",),
        ("doctrine:trinity",),
    ),
    (r"cristo|christ|encarnacao|incarnation", ("trindade-cristologia",), ("topic:christology",)),
    (r"espirito santo|holy spirit|holy ghost", ("pneumatologia",), ()),
    (r"pecado|sin\b|queda|fall\b", ("hamartiologia-justificacao",), ("topic:hamartiology",)),
    (
        r"graca|grace|justific|redencao|salvacao|salvation",
        ("etica-soteriologia", "hamartiologia-justificacao"),
        ("topic:soteriology",),
    ),
    (
        r"sacramento|sacrament|batismo|baptism|eucarist|eucharist",
        ("sacramentos-santificacao", "eclesiologia-liturgia"),
        ("topic:sacramentology",),
    ),
    (r"igreja|church|liturg|concil|council", ("eclesiologia-liturgia", "historia-tradicoes"), ()),
    (
        r"ressurreicao|resurrection|juizo|judgment|judgement|vida eterna|eternal life|escatolog",
        ("escatologia",),
        (),
    ),
    (
        r"virtude|virtue|santificacao|sanctification|lei\b|law\b|mandamento",
        ("etica-soteriologia",),
        (),
    ),
    (
        r"escritura|scripture|hermeneut|interpret|exeg|genero literario",
        ("hermeneutica-metodos", "exegese-recepcao"),
        (),
    ),
)
HEADING = re.compile(
    r"^(?:Quest[aã]o[ \t]+\d+|Art\.[ \t]*\d+|CHAPTER[ \t]+[IVXLCDM\d]+|"
    r"CAP[IÍ]TULO[ \t]+[IVXLCDM\d]+|Cap[ií]tulo[ \t]+[IVXLCDM\d]+|"
    r"LIVRO[ \t]+[IVXLCDM]+|BOOK[ \t]+[IVXLCDM]+|ARTIGO[ \t]+[IVXLCDM\d]+|"
    r"\d{1,3}\.[ \t]+[A-ZÁÉÍÓÚÂÊÔÃÕ][A-ZÁÉÍÓÚÂÊÔÃÕ \t—–,:-]{8,})[^\n]{0,220}$",
    re.MULTILINE,
)
SUMMA_ROLE = re.compile(
    r"^(?:Mas,\s+em contr[aá]rio[^\n]*|SOLU[CÇ][AÃ]O\.[^\n]*|"
    r"DONDE A RESPOSTA[^\n]*|RESPOSTA [ÀA][^\n]*)",
    re.MULTILINE,
)


def subjects(title: str, base: tuple[str, ...]) -> list[str]:
    result = {f"study-guide:{topic}" for topic in base}
    for pattern, guides, entities in SUBJECTS:
        if re.search(pattern, normalized(title)):
            result.update(f"study-guide:{guide}" for guide in guides)
            result.update(entities)
    return sorted(result)


def sections(pages: list[Page], profile: Profile) -> list[Entry]:
    """Page-spanning section continuity; role markers cannot become an author's conclusion.

    Limits every evidence unit to one physical page, documenting the continuation instead of
    pretending to have reconstructed the whole article. Never uses the table of contents.
    """
    result: list[Entry] = []
    locator = ""
    question = ""
    part = 1
    previous_question = 0
    role: Role = "section"
    paragraph = 0
    chapter = ""
    book_context = ""
    for page in pages:
        if not profile.first_page <= page.number <= profile.last_page:
            continue
        # Some imported text layers contain embedded NULs. Node's SQLite text adapter
        # truncates them: quarantine rather than silently editing the original evidence.
        if "\x00" in page.text:
            locator = ""
            question = ""
            continue
        # A dotted contents page or a bibliography cannot inherit the previous chapter.
        prefix = re.sub(r"\s+", "", normalized(page.text[:130]))
        oxford_header = (
            re.match(r"^c h a p t e r ([\d ]+)\s*\n", page.text)
            if profile.strategy == "oxford"
            else None
        )
        if oxford_header:
            title_lines = []
            for line in page.text[oxford_header.end() :].splitlines():
                cleaned = re.sub(r"\.{3,}.*", "", line).strip()
                if not cleaned:
                    continue
                if not cleaned.isupper():
                    break
                title_lines.append(cleaned)
            locator = "Capítulo " + oxford_header[1].replace(" ", "")
            locator += " · " + " / ".join(title_lines)
            role = "section"
        bibliography = (
            bool(
                re.search(
                    r"^\s*(?:bibliografia|bibliography|[íi]ndice anal[íi]tico)\b",
                    page.text[:140],
                    re.MULTILINE | re.IGNORECASE,
                )
            )
            if profile.strategy == "recovered"
            else any(word in prefix for word in ("bibliografia", "bibliography", "indiceanalitico"))
        )
        if profile.strategy == "oxford":
            bibliography = bool(
                re.search(
                    r"^(?:references(?: and suggested reading)?|bibliography|further reading)\b",
                    page.text[:400],
                    re.MULTILINE | re.IGNORECASE,
                )
            )
        contents = (
            sum(bool(re.search(r"\.{3,}\s*\d+", line)) for line in page.text.splitlines()) > 4
            if profile.strategy == "oxford"
            else page.text.count("....") > 4
        )
        if contents or bibliography:
            locator = ""
            if profile.strategy == "recovered" and page.text.count("....") <= 4:
                header = HEADING.search(page.text[:120])
                if header:
                    locator = header.group().strip()
                    following = page.text[header.end() :].lstrip("\n").splitlines()
                    if following and 3 <= len(following[0].strip()) <= 100:
                        locator += " · " + following[0].strip()
                    role = "section"
            continue
        matches = (
            []
            if profile.strategy == "oxford"
            else [m for m in HEADING.finditer(page.text) if "..." not in m.group()]
        )
        if profile.strategy == "confessions":
            matches += list(
                re.finditer(
                    r"^(?:LIVRO [A-ZÉÊÁÍÓÚ \-]+|DE[ \t]+MAGISTRO)$", page.text, re.MULTILINE
                )
            )
        if profile.strategy == "nag-tractates":
            names = {
                "evangeliodefelipe",
                "evangeliodetomas",
                "evangeliodelosegipcios",
                "dialogodelsalvador",
                "sabiduriadejesucristo",
                "lahijadepedro",
                "hechosdepedroylosdoceapostoles",
                "cartadepedroafelipe",
                "oraciondepablo",
                "librodetomaselatleta",
                "apocrifodesantiago",
            }
            matches = [
                m
                for m in re.finditer(r"^[^\n]+$", page.text, re.MULTILINE)
                if m.start() < 400 and re.sub(r"[^a-z]", "", normalized(m.group())) in names
            ]
        augustine = profile.strategy == "recovered" and profile.checksum.startswith("2cb74")
        if augustine:
            matches += list(
                re.finditer(r"^LIVRO\s*(?:IV|III|HI|II|I)[ \t]*$", page.text, re.MULTILINE)
            )
        if profile.heading_pattern:
            matches += list(re.finditer(profile.heading_pattern, page.text, re.MULTILINE))
        if profile.strategy == "summa":
            matches += list(SUMMA_ROLE.finditer(page.text))
        if profile.strategy == "catechism":
            for match in re.finditer(r"^\d{1,4}\.[ \t]+(?=\S)", page.text, re.MULTILINE):
                number = int(match.group().strip(". \t"))
                if (paragraph == 0 and 26 <= number <= 30) or number == paragraph + 1:
                    paragraph = number
                    matches.append(match)
        positions = sorted({0, len(page.text), *(match.start() for match in matches)})
        markers = {match.start(): match.group().strip() for match in matches}
        if profile.strategy == "confessions":
            for match in matches:
                if match.group().startswith("CAPÍTULO"):
                    following = page.text[match.end() :].lstrip("\n").splitlines()
                    if following and 3 <= len(following[0].strip()) <= 100:
                        markers[match.start()] += " · " + following[0].strip()
        if profile.strategy == "recovered":
            for match in matches:
                if re.fullmatch(r"CAP[IÍ]TULO\s+\d+", match.group().strip()):
                    following = page.text[match.end() :].lstrip("\n").splitlines()
                    if following and 3 <= len(following[0].strip()) <= 100:
                        markers[match.start()] += " · " + following[0].strip()
        for start, end in pairwise(positions):
            heading = markers.get(start, "")
            if heading:
                if profile.strategy == "confessions" and (
                    heading.startswith("LIVRO ") or heading.startswith("DE ")
                ):
                    book_context = (
                        "De Magistro (O Mestre)" if heading.startswith("DE ") else heading
                    )
                    locator = ""
                    continue
                if augustine and re.fullmatch(r"LIVRO\s*(?:IV|III|HI|II|I)", heading):
                    roman = re.sub(r"^LIVRO\s*", "", heading).replace("HI", "III")
                    book_context = "Livro " + roman
                    locator = book_context
                    role = "section"
                    continue
                q = re.match(r"Quest[aã]o\s+(\d+)", heading)
                if q:
                    number = int(q[1])
                    if number < previous_question:
                        part += 1
                    previous_question = number
                    question = f"Parte sequencial {part} · {heading}"
                    locator = question
                    role = "question"
                elif profile.strategy == "summa":
                    if heading.startswith("Art."):
                        locator = f"{question} · {heading}"
                        role = "objection"
                    elif normalized(heading).startswith("mas,"):
                        role = "counterpoint"
                    elif normalized(heading).startswith("solucao"):
                        role = "response"
                    else:
                        role = "reply"
                else:
                    if profile.strategy == "catechism" and re.fullmatch(r"\d+\.", heading):
                        locator = f"{chapter} · Catecismo § {heading.strip('. ')}".strip(" ·")
                    else:
                        chapter = heading
                        locator = heading
                    role = "section"
            if (
                (augustine or profile.strategy == "confessions")
                and locator
                and book_context
                and not locator.startswith(book_context + " · ")
            ):
                locator = book_context + " · " + re.sub(r"^Livro [IV]+ · ", "", locator)
            if not locator:
                continue
            text = page.text[start:end]
            if len(text.strip()) < 80:
                continue
            # Long blocks are split without losing words or original offsets.
            for offset in range(0, len(text), 10000):
                quote = text[offset : offset + 10000]
                if len(quote.strip()) < 20:
                    continue
                first = start + offset
                last = first + len(quote)
                result.append(
                    {
                        "domain": profile.domain,
                        "context": {
                            "topicIds": subjects(locator, profile.topics),
                            "locator": locator[:500],
                            "sectionPath": [question[:300], locator[:300]]
                            if question
                            else [locator[:300]],
                            "role": role,
                            "author": profile.author,
                            "tradition": profile.tradition,
                            "rationale": (
                                "Associação documental pelo título da seção e pelo perfil "
                                "da edição; não deduz destino bíblico de palavras isoladas."
                            ),
                            "limitations": [
                                "Recorte físico da seção, com possível continuação nas páginas "
                                "vizinhas; extração automática não equivale a revisão acadêmica.",
                                "Introduções e posições de terceiros permanecem no original; "
                                "a autoria identifica a obra, não atribui cada frase ao autor.",
                            ],
                        },
                        "fragments": [
                            {
                                "physicalPage": page.number,
                                "pageTextChecksum": digest(page.text),
                                "startOffset": len(page.text[:first].encode("utf-16-le")) // 2,
                                "endOffset": len(page.text[:last].encode("utf-16-le")) // 2,
                                "quote": quote,
                            }
                        ],
                    }
                )
    return result


RECOVERED_PROFILES = (
    Profile(
        "2cb74a2188c2cd4e8696bd836616a15e68113bef4776ba57936345a110280503",
        "Agostinho de Hipona",
        "Patrística latina",
        19,
        ("hermeneutica-metodos", "exegese-recepcao"),
        "hermeneutics",
        "recovered",
        137,
    ),
    Profile(
        "0f77aeea4cd6975af4dac5e5008471c2a7fd48952be985c0b4f5b4ade1ebcadc",
        "Uwe Wegner",
        "Metodologia histórico-crítica; não representa toda tradição",
        8,
        ("exegese-recepcao", "hermeneutica-metodos"),
        "exegesis",
        "recovered",
        129,
        r"^(?:[1-9]\d?\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][^\n]{5,100}|[A-ZÁÉÍÓÚÂÊÔÃÕ][A-ZÁÉÍÓÚÂÊÔÃÕ ,:-]{8,100})$",
    ),
    Profile(
        "d32664a467dbf4f1b70c18420f55263c68e85d8395e4353b5643327128b18548",
        "George Eldon Ladd",
        "Teologia bíblica evangélica",
        15,
        ("teologia", "exegese-recepcao"),
        "theology",
        "recovered",
        207,
    ),
    Profile(
        "d799d5888b2a8f0b5eaba8c05fb590d2a40e885819d6dc9eaff25aacb9782d12",
        "Vladimir Lossky",
        "Ortodoxa",
        7,
        ("teologia", "historia-tradicoes"),
        "theology",
        "recovered",
        180,
        r"(?i:^(?:[IVXLCDM]{1,5}[.]?\s+)?(?:INTRODUCCI[ÓO]N|TEOLOG[ÍI]A Y M[ÍI]STICA|"
        r"LAS TINIEBLAS DIVINAS|DIOS[-— ]TRINIDAD|ENERG[ÍI]AS INCREADAS|EL SER CREADO|"
        r"IMAGEN Y SEMEJANZA|ECONOM[ÍI]A DEL HIJO|ECONOM[ÍI]A DEL ESP[ÍI]RITU SANTO|"
        r"DOS ASPECTOS DE LA IGLESIA|V[ÍI]A DE LA UNI[ÓO]N|LA LUZ DIVINA|CONCLUSI[ÓO]N)"
        r"[^\n]{0,100}$)",
    ),
    Profile(
        "f1ee2d41a78f8ca221e4224c253b8b909809745f11bd6cf0b301d889c493bb15",
        "Gerhard von Rad",
        "Pesquisa histórico-crítica; trechos da edição instalada",
        8,
        ("teologia", "historia-tradicoes"),
        "theology",
        "recovered",
        19,
        r"^(?:OS PRIMEIROS TEMPOS|A PROFECIA PR[ÉE]-CL[ÁA]SSICA|"
        r"ORIGEM DA HISTORIOGRAFIA)[^\n]{0,100}$",
    ),
)


def build(
    workspace: Path,
    destination: Path,
    recovered_only: bool = False,
    checksums: tuple[str, ...] = (),
    additional_only: bool = False,
) -> dict[str, object]:
    profiles: tuple[Profile, ...] = (
        RECOVERED_PROFILES
        if recovered_only
        else (ADDITIONAL_PROFILES if additional_only else PROFILES)
    )
    if checksums:
        if set(checksums) - {profile.checksum for profile in profiles}:
            raise ValueError("No calibrated profile for the requested edition")
        profiles = tuple(profile for profile in profiles if profile.checksum in checksums)
    destination.mkdir(parents=True, exist_ok=False)
    reports: list[dict[str, object]] = []
    files: list[dict[str, str]] = []
    with sqlite3.connect(workspace.resolve().as_uri() + "?mode=ro", uri=True) as db:
        for profile in profiles:
            document = db.execute(
                "SELECT id,title FROM private_documents WHERE checksum=?", (profile.checksum,)
            ).fetchone()
            if document is None:
                reports.append({"checksum": profile.checksum, "status": "edition-unavailable"})
                continue
            pages = [
                Page(int(n) + 1, str(text))
                for n, text in db.execute(
                    "SELECT page_index,text FROM private_document_pages "
                    "WHERE document_id=? ORDER BY page_index",
                    (document[0],),
                )
            ]
            entries = sections(pages, profile)
            for index in range(0, len(entries), 80):
                raw = json.dumps(
                    {
                        "format": "scriptorium-thematic-readings-v1",
                        "sourceChecksum": profile.checksum,
                        "entries": entries[index : index + 80],
                    },
                    ensure_ascii=False,
                )
                name = f"{profile.checksum[:12]}-{index // 80:04d}.json"
                (destination / name).write_text(raw, encoding="utf-8")
                files.append({"file": name, "sha256": digest(raw)})
            reports.append(
                {
                    "checksum": profile.checksum,
                    "title": document[1],
                    "entries": len(entries),
                    "nulPagesQuarantined": sum("\x00" in page.text for page in pages),
                    "status": "staged" if entries else "no-validated-headings",
                    "textPages": sum(bool(page.text.strip()) for page in pages),
                    "physicalPages": len(pages),
                }
            )
        blocked = [
            {"title": title, "pages": count, "status": "ocr-required"}
            for title, count in db.execute(
                "SELECT title,page_count FROM private_documents WHERE text_page_count=0"
            )
        ]
    report: dict[str, object] = {
        "format": "scriptorium-thematic-report-v1",
        "sources": reports,
        "blocked": blocked,
        "files": files,
        "limitations": [
            "No biblical relations or argument conclusions inferred",
            "Heading-driven staging, not integral contextual review",
        ],
    }
    (destination / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--recovered-only", action="store_true")
    parser.add_argument("--additional-only", action="store_true")
    parser.add_argument("--checksums", default="")
    args = parser.parse_args()
    report = build(
        args.workspace,
        args.destination,
        args.recovered_only,
        tuple(filter(None, args.checksums.split(","))),
        args.additional_only,
    )
    print(
        json.dumps({"sources": report["sources"], "blocked": report["blocked"]}, ensure_ascii=False)
    )


if __name__ == "__main__":
    main()
