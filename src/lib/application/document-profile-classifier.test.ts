import { describe, expect, it } from "vitest";
import { classifyDocumentProfile } from "./document-profile-classifier";

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
