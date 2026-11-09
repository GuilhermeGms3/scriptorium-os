import { describe, expect, it } from "vitest";
import { classifyDocumentProfile, normalizeProfileTitle } from "./document-profile-classifier";

describe("classifyDocumentProfile", () => {
  it.each([
    ["Biblioteca de Nag Hammadi — Volume II", "nag-hammadi-anthology"],
    ["Bíblia de Estudo de Genebra", "study-bible"],
    ["Dicionário Internacional de Teologia do Antigo Testamento", "dictionary"],
    ["Catecismo da Igreja Católica", "catechism"],
    ["Confissão de Westminster", "confession"],
    ["Exegese e hermenêutica de textos bíblicos", "exegesis-method"],
  ])("classifies %s", (title, expected) => {
    expect(classifyDocumentProfile(title).profile).toBe(expected);
  });

  it("uses a conservative monograph fallback", () => {
    expect(classifyDocumentProfile("Questões contemporâneas").profile).toBe("academic-monograph");
  });
});

describe("real file titles", () => {
  it.each([
    ["Biblia-de-Jerusalem", "study-bible"],
    ["confissu-o-de-augsburgo", "confession"],
    ["teologiado-novo-testamento-george-eldon-ladd", "biblical-theology"],
    ["Teologia AT von Rad", "biblical-theology"],
    ["joao_calvino_institutas1", "systematic-theology"],
    ["suma-teolc3b3gica", "systematic-theology"],
    ["exegese-do-novo-testamento-manual-de-metodologia", "exegesis-method"],
  ])("classifies %s", (title, expected) => {
    expect(classifyDocumentProfile(title).profile).toBe(expected);
  });

  it.each([
    ["nag_hammadi_biblioteca_completa", "nag-hammadi-anthology"],
    ["Confissão de Fé de Westminster", "confession"],
    ["Patrística - Vol. 1 - Padres Apostólicos", "patristic-work"],
    ["Confissões de Agostinho", "patristic-work"],
    ["Dicionário Bíblico Wycliffe", "dictionary"],
    ["dicionario-de-teologia-biblica", "dictionary"],
    ["Léxico do Novo Testamento Grego-Português", "lexicon"],
    ["Antigo-Testamento-Interlinear-Hebraico-Portugues", "interlinear"],
  ])("keeps classifying %s", (title, expected) => {
    expect(classifyDocumentProfile(title).profile).toBe(expected);
  });
});

describe("normalizeProfileTitle", () => {
  it.each([
    ["suma-teolc3b3gica", "suma teologica"],
    ["Confiss%C3%A3o_de_F%C3%A9", "confissao de fe"],
    ["joao_calvino_institutas1", "joao calvino institutas1"],
    ["Teologia AT — von Rad", "teologia at von rad"],
  ])("normalizes %s", (title, expected) => {
    expect(normalizeProfileTitle(title)).toBe(expected);
  });

  it("does not decode ordinary words that look like hexadecimal", () => {
    expect(normalizeProfileTitle("Cabana do Deadbeef")).toBe("cabana do deadbeef");
  });
});
