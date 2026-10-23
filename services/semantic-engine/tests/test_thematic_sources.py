from app.thematic_sources import Page, Profile, sections, subjects


def profile(strategy: str = "summa") -> Profile:
    return Profile(
        "a" * 64, "Synthetic author", "Synthetic tradition", 2, ("teologia",), "theology", strategy
    )


def test_preserves_objection_response_and_reply_across_pages() -> None:
    intro = "Questão 1: Da doutrina sagrada\nArt. 1 — Se ela é ciência.\n"
    argument = "Parece que não é ciência. " * 8
    solution = "SOLUÇÃO. — A doutrina é ciência. " + "Explicação da resposta. " * 8
    reply = "RESPOSTA À PRIMEIRA. — Distinguimos as razões. " + "Outra razão. " * 8
    result = sections(
        [Page(1, "Índice\n" + intro), Page(2, intro + argument), Page(3, solution), Page(4, reply)],
        profile(),
    )
    roles = [entry["context"]["role"] for entry in result]
    assert roles == ["objection", "response", "reply"]
    assert all(entry["fragments"][0]["physicalPage"] >= 2 for entry in result)
    assert "Questão 1" in str(result[-1]["context"])


def test_specific_subjects_use_heading_not_body_keywords() -> None:
    assert "study-guide:pneumatologia" in subjects("Do Espírito Santo", ("teologia",))
    text = "CHAPTER I. KNOWLEDGE\n" + "The Holy Spirit is mentioned incidentally. " * 10
    result = sections([Page(2, text)], profile("sections"))
    assert "study-guide:pneumatologia" not in str(result)
    assert "study-guide:teologia" in str(result)


def test_no_headings_no_invented_sections() -> None:
    assert sections([Page(2, "A paragraph without a structural heading. " * 10)], profile()) == []


def test_utf16_offsets_preserve_astral_characters() -> None:
    text = "😀\nCHAPTER I. CREATION\n" + "Body of a synthetic section. " * 10
    result = sections([Page(2, text)], profile("sections"))
    fragment = result[0]["fragments"][0]
    assert fragment["startOffset"] == 3
    assert (
        text.encode("utf-16-le")[fragment["startOffset"] * 2 : fragment["endOffset"] * 2].decode(
            "utf-16-le"
        )
        == fragment["quote"]
    )


def test_bibliography_year_is_not_a_heading_and_contents_cannot_inherit() -> None:
    assert (
        sections(
            [Page(2, "1979.\nBIBLIOGRAFIA\n" + "Referência sintética. " * 10)], profile("sections")
        )
        == []
    )
    result = sections(
        [
            Page(2, "CHAPTER I. TOPIC\n" + "Body. " * 20),
            Page(3, "CONTENTS\n" + "Title ............. 22\n" * 8),
        ],
        profile("sections"),
    )
    assert len(result) == 1


def test_catechism_ignores_internal_numbered_lists() -> None:
    p = profile("catechism")
    text = (
        "26. "
        + "First paragraph. " * 10
        + "\n1. "
        + "Internal list. " * 10
        + "\n27. "
        + "Second paragraph. " * 10
    )
    result = sections([Page(2, text)], p)
    assert [entry["context"]["locator"] for entry in result] == ["Catecismo § 26", "Catecismo § 27"]


def test_embedded_nul_quarantines_page_and_stops_inherited_context() -> None:
    pages = [
        Page(2, "CHAPTER I. TOPIC\n" + "Body. " * 20),
        Page(3, "Invalid\x00" + "text " * 30),
        Page(4, "Continuation " * 30),
    ]
    assert len(sections(pages, profile("sections"))) == 1
