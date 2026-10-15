import { describe, expect, it } from "vitest";
import { detectReferenceZone } from "./reference-zone";

describe("detectReferenceZone", () => {
  it("recognizes three or more lines that are only book names as a canon list", () => {
    expect(detectReferenceZone({ text: "Gênesis\nÊxodo\nLevítico\nNúmeros" })).toBe("canon-list");
    expect(detectReferenceZone({ text: "1 João\n2 João\n3 João\nJudas" })).toBe("canon-list");
    expect(
      detectReferenceZone({ text: "Juízes    1 Crônicas\nRute    2 Crônicas\nJó  Salmos" }),
    ).toBe("canon-list");
    expect(detectReferenceZone({ text: "Gênesis 1:1\nÊxodo 3:14\nLevítico 19:18" })).toBe("body");
    expect(detectReferenceZone({ text: "Gênesis\nÊxodo" })).toBe("body");
  });

  it("recognizes a table of contents by its title or by page-numbered lines", () => {
    for (const sectionTitle of [
      "Sumário",
      "SUMÁRIO",
      "Índice",
      "Conteúdo",
      "Contents",
      "Índice geral",
    ])
      expect(detectReferenceZone({ text: "Capítulo 1 — A criação", sectionTitle })).toBe("toc");
    expect(
      detectReferenceZone({
        text: "Introdução ........................ 7\nCapítulo 1: A criação ....... 12\nCapítulo 2 O êxodo 45",
      }),
    ).toBe("toc");
  });

  it("recognizes an index by its title or by term-and-pages lines", () => {
    for (const sectionTitle of [
      "Índice remissivo",
      "Índice de passagens",
      "Índice bíblico",
      "Index",
    ])
      expect(detectReferenceZone({ text: "Graça, 12", sectionTitle })).toBe("index");
    expect(
      detectReferenceZone({ text: "Graça, 12, 45, 78\nJustificação, 3, 9\nLei, 22–24, 31" }),
    ).toBe("index");
    expect(
      detectReferenceZone({ text: "Jo 3:16 ........ 45\nRm 5:8 ..... 12\nGn 1:1 .... 3" }),
    ).toBe("index");
  });

  it("recognizes a bibliography by its title or by a bibliography-entry unit", () => {
    for (const sectionTitle of [
      "Bibliografia",
      "Referências bibliográficas",
      "Bibliography",
      "Obras citadas",
    ])
      expect(detectReferenceZone({ text: "BRUCE, F. F. João. 1987.", sectionTitle })).toBe(
        "bibliography",
      );
    expect(
      detectReferenceZone({ text: "BRUCE, F. F. João. 1987.", unitKind: "bibliography-entry" }),
    ).toBe("bibliography");
  });

  it("keeps ordinary prose in the body, even when a line ends with a number", () => {
    expect(
      detectReferenceZone({
        text: "Em João 3:16 lemos sobre o amor de Deus.\nCompare Rm 5:8 e Gênesis 22.\nO argumento continua no capítulo 12",
        sectionTitle: "Capítulo 2 — O amor de Deus",
      }),
    ).toBe("body");
  });

  it("does not read author-year notes as a table of contents or an index", () => {
    expect(detectReferenceZone({ text: "1 BRUCE, 1987\n2 CARSON, 2010\n3 Ver Gênesis 22" })).toBe(
      "body",
    );
    expect(
      detectReferenceZone({ text: "BRUCE, 1987, p. 45\nCARSON, 2010, p. 12\nWRIGHT, 2003, pp. 9" }),
    ).toBe("body");
    expect(detectReferenceZone({ text: "BRUCE, 1987\nCARSON, 2010\nWRIGHT, 2003" })).toBe("body");
  });

  it("does not turn a short list of names followed by prose into a canon list", () => {
    expect(
      detectReferenceZone({
        text: "Mateus\nMarcos\nLucas\nJoão 3:16 é citado pelos três evangelistas.",
      }),
    ).toBe("body");
    expect(detectReferenceZone({ text: "DO ANTIGO TESTAMENTO:\nGênesis\nÊxodo\nLevítico" })).toBe(
      "canon-list",
    );
  });

  it("applies the zone of the whole page to a short span that has the same shape", () => {
    const pageText =
      "Introdução ........ 7\n\nCapítulo 1 ........ 12\n\nCapítulo 2 ........ 45\n\nCapítulo 3 ........ 78";
    expect(detectReferenceZone({ text: "Capítulo 2 ........ 45", pageText })).toBe("toc");
    expect(
      detectReferenceZone({
        text: "Um parágrafo comum sobre João 3:16 que não é sumário.",
        pageText,
      }),
    ).toBe("body");
  });
});
