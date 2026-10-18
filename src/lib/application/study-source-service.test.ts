import { afterEach, describe, expect, it, vi } from "vitest";
import { StudySourceService } from "./study-source-service";
import { LibraryRepository } from "../repositories/library-repository";
import { BibliographicSourceSchema } from "../domain/bibliography";
import { PrimarySourceRepository } from "../repositories/primary-source-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import type { StoredTextUnit } from "../corpus-runtime/contracts";
import { studySourceHref } from "../domain/study-notebook";

afterEach(() => vi.restoreAllMocks());
describe("leitura contextual de fontes", () => {
  it("reads only the requested primary unit and keeps its original language", async () => {
    const unit: StoredTextUnit = {
      id: "unit:1",
      corpusId: "corpus:1",
      editionId: "edition:1",
      workId: "work:1",
      sequence: 1,
      unitType: "section",
      text: "ⲛⲁϣⲁϫⲉ",
      language: "cop",
      provenance: { acquisition: "imported", creationMethod: "human" },
    };
    const get = vi.spyOn(PrimarySourceRepository, "getUnit").mockResolvedValue(unit);
    const full = vi.spyOn(PrimarySourceRepository, "getDocument");
    expect(
      await StudySourceService.read({
        kind: "primary-text",
        workId: "work:1",
        unitId: "unit:1",
        title: "Tomé",
      }),
    ).toEqual({ text: unit.text, language: "cop" });
    expect(get).toHaveBeenCalledWith("work:1", "unit:1");
    expect(full).not.toHaveBeenCalled();
  });
  it("does not invent text when a primary unit is missing", async () => {
    vi.spyOn(PrimarySourceRepository, "getUnit").mockResolvedValue(null);
    await expect(
      StudySourceService.read({
        kind: "primary-text",
        workId: "missing",
        unitId: "missing",
        title: "Fonte",
      }),
    ).rejects.toThrow(/não encontrado/);
  });
  it("fails recoverably for an unavailable private book", async () => {
    vi.spyOn(PrivateDocumentRepository, "getDocument").mockResolvedValue(null);
    const list = vi.spyOn(DocumentKnowledgeRepository, "listUnits");
    await expect(
      StudySourceService.read({
        kind: "private-document",
        documentId: "missing",
        page: 3,
        title: "Fonte",
      }),
    ).rejects.toThrow(/não está disponível/);
    expect(list).not.toHaveBeenCalled();
  });
  it("distinguishes bibliographic metadata from installed full text and refuses unsafe external URLs", async () => {
    vi.spyOn(KnowledgeRepository, "sourceReference").mockResolvedValue({
      id: "source:1",
      work: "Obra",
      author: "Autor",
      url: "javascript:alert(1)",
      provenance: { acquisition: "editorial", creationMethod: "human" },
    });
    const source = {
      kind: "bibliographic" as const,
      sourceId: "source:1",
      title: "Obra",
      locator: "p. 7",
    };
    expect(await StudySourceService.read(source)).toMatchObject({
      metadataOnly: true,
      language: "pt-BR",
    });
    expect((await StudySourceService.read(source)).externalUrl).toBeUndefined();
    expect(studySourceHref(source)).toBe("/library?source=source%3A1");
    vi.mocked(KnowledgeRepository.sourceReference).mockResolvedValue(null);
    vi.spyOn(LibraryRepository, "getSource").mockResolvedValue(null);
    expect(await StudySourceService.read(source)).toMatchObject({ metadataOnly: true });
  });
  it("reads saved external bibliography from the canonical library without pretending to install full text", async () => {
    vi.spyOn(KnowledgeRepository, "sourceReference").mockResolvedValue(null);
    const local = BibliographicSourceSchema.parse({
      id: "source:external",
      title: "DEMO — referência acadêmica",
      sourceType: "journal-article",
      publicationYear: 2020,
      identifiers: { url: "https://openalex.org/W123456789" },
      rights: { metadataRedistributable: true, contentRedistributable: false, localOnly: true },
      provenance: {
        origin: "user-import",
        importMethod: "csl-json",
        importedAt: "2026-10-18T00:00:00.000Z",
      },
    });
    vi.spyOn(LibraryRepository, "getSource").mockResolvedValue(local);
    const result = await StudySourceService.read({
      kind: "bibliographic",
      sourceId: local.id,
      title: local.title,
    });
    expect(result).toMatchObject({
      metadataOnly: true,
      language: "pt-BR",
      externalUrl: local.identifiers["url"],
    });
    expect(result.text).toContain("2020");
    expect(result.text).toContain("não foi baixado");
  });
});
