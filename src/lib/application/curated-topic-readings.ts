import {
  PRIVATE_STUDY_READINGS,
  SUMMA_READING_NOTICE,
  type PrivateStudyReading,
} from "../content/private-study-readings";
import { PrivateDocumentRepository } from "../repositories/private-document-repository";
import { sha256Hex } from "../workspace-runtime/secure-context";
import type { TopicReading } from "./study-topic-service";

interface Dependencies {
  document: (checksum: string) => Promise<{
    id: string;
    title: string;
    checksum: string;
    language?: string | undefined;
  } | null>;
  page: (id: string, index: number) => Promise<{ text: string } | null>;
}

/** A locator becomes available only when its exact edition AND extracted page match.
 * No book scan, no invented excerpts, no promotion to a verified doctrinal claim.
 */
export async function loadCuratedTopicReadings(
  topicId: string,
  dependencies: Dependencies = {
    document: (checksum) => PrivateDocumentRepository.findByChecksum(checksum),
    page: (id, index) => PrivateDocumentRepository.getPage(id, index),
  },
  catalog: readonly PrivateStudyReading[] = PRIVATE_STUDY_READINGS,
): Promise<{ items: TopicReading[]; warnings: string[] }> {
  const selected = catalog.filter((reading) => reading.topics.includes(topicId));
  const checksums = [...new Set(selected.map((reading) => reading.checksum))];
  const documents = new Map(
    await Promise.all(
      checksums.map(async (checksum) => [checksum, await dependencies.document(checksum)] as const),
    ),
  );
  const warnings = new Set<string>();
  const items: TopicReading[] = [];
  for (const reading of selected) {
    const document = documents.get(reading.checksum);
    if (!document || document.checksum !== reading.checksum) continue;
    const page = await dependencies.page(document.id, reading.page - 1);
    if (
      !page ||
      (await sha256Hex(new TextEncoder().encode(page.text))) !== reading.pageTextChecksum
    ) {
      warnings.add(
        "Uma leitura selecionada mudou de extração ou está sem página; o vínculo não foi disponibilizado. Confira a edição na Biblioteca.",
      );
      continue;
    }
    items.push({
      id: `selected:${reading.id}`,
      title: document.title,
      locator: `${reading.locator} · p. física ${reading.page}`,
      excerpt: "",
      origin: "private-curated",
      ...(document.language ? { language: document.language } : {}),
      guidance: `${reading.purpose} ${SUMMA_READING_NOTICE}`,
      source: {
        kind: "private-document",
        documentId: document.id,
        page: reading.page,
        title: document.title,
      },
    });
  }
  return { items, warnings: [...warnings] };
}
