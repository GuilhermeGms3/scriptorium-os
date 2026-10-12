import { describe, expect, it } from "vitest";
import { chooseDocumentTitle, detectDocumentLanguage } from "./private-document-import-service";

describe("detectDocumentLanguage", () => {
  it.each([
    [
      "pt-BR",
      "A interpretação do texto não depende apenas da palavra, mas também do contexto em que o autor escreve.",
    ],
    [
      "en",
      "The interpretation of the text is not based only on the word, but also on the context in which the author writes.",
    ],
    [
      "es",
      "La interpretación del texto no depende solo de una palabra, sino del contexto en que el autor escribe.",
    ],
    ["he", "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ"],
    ["el", "Ἐν ἀρχῇ ἦν ὁ λόγος καὶ ὁ λόγος ἦν πρὸς τὸν θεόν"],
  ])("detects %s without translating source-language corpora", (language, text) => {
    expect(detectDocumentLanguage(text)).toBe(language);
  });
});

describe("chooseDocumentTitle", () => {
  it("rejects generic or unrelated PDF metadata when the filename is meaningful", () => {
    expect(chooseDocumentTitle("Microsoft Word - Documento3", "A Igreja Ortodoxa.pdf")).toBe(
      "A Igreja Ortodoxa",
    );
    expect(
      chooseDocumentTitle(
        "Microsoft Word - Documento3",
        "pdfcoffee.com_bispo-kallistos-ware-a-igreja-ortodoxa-pdf-free.pdf",
      ),
    ).toBe("bispo kallistos ware a igreja ortodoxa");
    expect(
      chooseDocumentTitle(
        "Segundo - Dogma que Liberta - Parte 2",
        "lexico-hebraico-e-aramaico-do-antigo-testamento.pdf",
      ),
    ).toBe("lexico hebraico e aramaico do antigo testamento");
  });

  it("keeps useful metadata when the filename is numeric", () => {
    expect(chooseDocumentTitle("CATECISMO DA IGREJA CATÓLICA", "214.pdf")).toBe(
      "CATECISMO DA IGREJA CATÓLICA",
    );
  });
});
