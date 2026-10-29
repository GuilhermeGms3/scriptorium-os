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


def test_recovered_chapter_bibliography_does_not_hide_following_body() -> None:
    recovered = profile("recovered")
    result = sections(
        [
            Page(2, "CAPÍTULO 1\nJoão Batista\nBibliografia\n" + "Referência. " * 20),
            Page(3, "Corpo explicativo do capítulo, após a bibliografia inicial. " * 10),
        ],
        recovered,
    )
    assert len(result) == 1
    assert result[0]["context"]["locator"] == "CAPÍTULO 1 · João Batista"
    assert result[0]["fragments"][0]["physicalPage"] == 3


def test_recovered_augustine_book_and_chapter_are_distinct_from_editorial_introduction() -> None:
    from app.thematic_sources import RECOVERED_PROFILES

    recovered = RECOVERED_PROFILES[0]
    result = sections(
        [
            Page(5, "CAPÍTULO 1\nIntrodução editorial\n" + "Não atribuir ao autor. " * 10),
            Page(19, "LIVRO I\n"),
            Page(
                20, "CAPÍTULO 1\nFinalidade geral da obra\n" + "Leitura sintética para teste. " * 10
            ),
            Page(102, "LIVRO IV\n"),
            Page(103, "CAPÍTULO 1\nRegra da exposição\n" + "Outro conteúdo de teste. " * 10),
            Page(139, "CAPÍTULO 1\nSumário final\n" + "Índice, não corpo. " * 10),
        ],
        recovered,
    )
    assert len(result) == 2
    assert result[0]["context"]["locator"].startswith("Livro I · CAPÍTULO 1")
    assert result[1]["context"]["locator"].startswith("Livro IV · CAPÍTULO 1")


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


def test_confessions_keeps_book_chapter_and_actual_subtitle() -> None:
    p = profile("confessions")
    pages = [
        Page(2, "LIVRO PRIMEIRO\nCAPÍTULO I\nLouvor e Invocação\n" + "Texto de teste. " * 15),
        Page(3, "LIVRO SEGUNDO\nCAPÍTULO I\nA memória\n" + "Outro texto. " * 15),
    ]
    result = sections(pages, p)
    assert len(result) == 2
    assert result[0]["context"]["locator"] == "LIVRO PRIMEIRO · CAPÍTULO I · Louvor e Invocação"
    assert result[1]["context"]["locator"].startswith("LIVRO SEGUNDO · CAPÍTULO I")


def test_oxford_decorative_rules_are_not_contents_and_bibliography_is_not_body() -> None:
    p = profile("oxford")
    text = (
        "c h a p t e r 1 1\n"
        + "." * 150
        + "\nL A N G U A G E\ns t a n l e y\n"
        + "Chapter body. " * 15
    )
    result = sections(
        [
            Page(2, text),
            Page(3, "References and Suggested Reading\n" + "Citation. " * 20),
            Page(4, "More bibliography. " * 20),
        ],
        p,
    )
    assert len(result) == 1
    assert result[0]["context"]["locator"] == "Capítulo 11 · L A N G U A G E"


def test_appended_de_magistro_does_not_inherit_confessions_book_thirteen() -> None:
    p = profile("confessions")
    result = sections(
        [
            Page(2, "LIVRO DÉCIMO-TERCEIRO\nCAPÍTULO I\nCriação\n" + "Teste. " * 20),
            Page(3, "DE   MAGISTRO\n"),
            Page(4, "CAPÍTULO I\nFINALIDADE DA LINGUAGEM\n" + "Diálogo. " * 20),
        ],
        p,
    )
    assert result[-1]["context"]["locator"].startswith("De Magistro (O Mestre) · CAPÍTULO I")


def test_spaced_nag_hammadi_titles_stop_the_previous_tractate_context() -> None:
    p = profile("nag-tractates")
    result = sections(
        [
            Page(2, "EVANGELIO DE TOMÁS\n" + "Texto. " * 20),
            Page(3, "E V A N G E L I O D E L O S E G I P C I O S\n" + "Outro. " * 20),
            Page(4, "APÓCRIFO DE SANTIAGO\n" + "Trecho. " * 20),
        ],
        p,
    )
    assert "TOMÁS" not in result[1]["context"]["locator"]
    assert "SANTIAGO" in result[2]["context"]["locator"]


def test_unknown_selected_edition_is_rejected_before_creating_output(tmp_path) -> None:
    from pathlib import Path

    import pytest

    from app.thematic_sources import build

    output = tmp_path / "staging"
    with pytest.raises(ValueError, match="calibrated"):
        build(Path("unused.sqlite3"), output, checksums=("a" * 64,), additional_only=True)
    assert not output.exists()
