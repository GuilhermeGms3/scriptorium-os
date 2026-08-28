import { describe, expect, it } from "vitest";
import { ScriptureRepository } from "../repositories/scripture-repository";
import { SourceRepository } from "../repositories/source-repository";
import {
  DEFAULT_LOCALE,
  DOCUMENT_LANGUAGE_CODES,
  bookLabel,
  languageLabel,
  statusLabel,
  t,
  textDirectionForLanguage,
} from ".";

describe("localização pt-BR", () => {
  it("usa pt-BR como locale principal", () => {
    expect(DEFAULT_LOCALE).toBe("pt-BR");
    expect(languageLabel(DEFAULT_LOCALE)).toBe("Português (Brasil)");
  });

  it("traduz as principais superfícies do Reader por chaves semânticas", () => {
    expect(t("scripture.reader")).toBe("Leitura");
    expect(t("scripture.view.original")).toBe("Texto original");
    expect(t("scripture.inspector.word")).toBe("Estudo da Palavra");
    expect(t("scripture.inspector.passage")).toBe("Inspetor da Passagem");
  });

  it("apresenta status internos em pt-BR sem alterar seus valores", () => {
    const internalStatus = "not-imported";
    expect(statusLabel(internalStatus)).toBe("Ainda não importado");
    expect(internalStatus).toBe("not-imported");
    expect(statusLabel("verified")).toBe("Verificado");
  });

  it("preserva IDs, rotas e identificadores técnicos internos", () => {
    const john = ScriptureRepository.getBook("john");
    expect(john?.id).toBe("john");
    expect(`/scripture/${john?.id}/1`).toBe("/scripture/john/1");
  });

  it("apresenta john como João sem modificar o registro canônico", () => {
    const john = ScriptureRepository.getBook("john");
    expect(bookLabel(john!.id, john!.name)).toBe("João");
    expect(john?.name).toBe("John");
  });

  it("não altera conteúdo documental por causa do locale da interface", () => {
    const sourceText = ScriptureRepository.getChapter("john", 1)?.verses[0]?.translations["web"];
    expect(sourceText).toBe(
      "In the beginning was the Word, and the Word was with God, and the Word was God.",
    );
    expect(DEFAULT_LOCALE).toBe("pt-BR");
    expect(SourceRepository.getReference("src-wh-john-1-1")?.language).toBe("grc");
  });

  it("mantém idioma e direção das edições independentes da UI", () => {
    const editions = ScriptureRepository.listEditions();
    const greek = editions.find((edition) => edition.id === "wh1881");
    const hebrew = editions.find((edition) => edition.id === "hebrew-demo");

    expect(greek).toMatchObject({ language: "grc", direction: "ltr" });
    expect(hebrew).toMatchObject({ language: "hbo", direction: "rtl" });
    expect(textDirectionForLanguage("arc")).toBe("rtl");
    expect(textDirectionForLanguage("pt-BR")).toBe("ltr");
  });

  it("declara os códigos documentais mínimos sem vinculá-los ao locale da UI", () => {
    expect(DOCUMENT_LANGUAGE_CODES).toEqual(
      expect.arrayContaining(["pt-BR", "en", "grc", "he", "arc", "la"]),
    );
  });
});
