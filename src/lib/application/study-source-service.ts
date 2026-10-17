import type { StudySource } from "../domain/study-notebook";
import { StudySourceSchema } from "../domain/study-notebook";
import { DocumentKnowledgeRepository } from "../repositories/document-knowledge-repository";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { PrimarySourceRepository } from "../repositories/primary-source-repository";
import { KnowledgeRepository } from "../repositories/knowledge-repository";

export const StudySourceService = {
  async read(
    input: StudySource,
  ): Promise<{ text: string; language: string; metadataOnly?: boolean; externalUrl?: string }> {
    const source = StudySourceSchema.parse(input);
    if (source.kind === "bibliographic") {
      const record = await KnowledgeRepository.sourceReference(source.sourceId);
      if (!record)
        return {
          text: [
            source.title,
            source.locator,
            "Referência guardada; o registro completo não está disponível no catálogo atual. Isso não indica que o texto integral esteja instalado.",
          ]
            .filter(Boolean)
            .join("\n"),
          language: "pt-BR",
          metadataOnly: true,
        };
      const url = record.url && /^https?:\/\//iu.test(record.url) ? record.url : undefined;
      return {
        text: [
          record.author,
          record.work,
          record.edition,
          record.year,
          source.locator,
          "Registro bibliográfico; o texto integral desta obra não está necessariamente instalado.",
        ]
          .filter(Boolean)
          .join("\n"),
        language: "pt-BR",
        metadataOnly: true,
        ...(url ? { externalUrl: url } : {}),
      };
    }
    if (source.kind === "primary-text") {
      if (!source.unitId)
        throw new Error("Esta fonte não possui um trecho identificado. Abra a obra na Biblioteca.");
      const unit = await PrimarySourceRepository.getUnit(source.workId, source.unitId);
      if (!unit) throw new Error("Trecho não encontrado na edição instalada.");
      return { text: unit.text, language: unit.language };
    }
    const document = await PrivateDocumentRepository.getDocument(source.documentId);
    if (!document) throw new Error("O livro não está disponível neste workspace.");
    if (source.unitId) {
      const unit = (
        await DocumentKnowledgeRepository.listUnits(source.documentId, [source.unitId])
      )[0];
      if (!unit)
        throw new Error(
          "O trecho original não está mais disponível. Consulte a página na Biblioteca.",
        );
      return { text: unit.text, language: document.language ?? "und" };
    }
    const page = await PrivateDocumentRepository.getPage(source.documentId, source.page - 1);
    if (!page) throw new Error("Página não encontrada.");
    return { text: page.text, language: document.language ?? "und" };
  },
};
