import { ScriptureRepository } from "../repositories/scripture-repository";
import { passageRefScheme } from "../domain/scripture";
import { createAudioItem } from "./preparation";
import { bookLabel } from "../i18n";

export async function scriptureNarration(
  bookId: string,
  chapter: number,
  editionId: string,
  start?: number,
  end?: number,
) {
  const edition = ScriptureRepository.listEditions().find((edition) => edition.id === editionId);
  const book = ScriptureRepository.getBook(bookId);
  if (!edition || !book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters)
    throw new Error("Passagem ou edição inválida.");
  // This phase offers temporary private device playback, never export/redistribution.
  if (
    !edition.licenseId ||
    !["CC-BY-3.0-BR", "Public-Domain", "CC-BY-4.0", "WLC-PD;OSHB-CC-BY-4.0"].includes(
      edition.licenseId,
    )
  )
    throw new Error("Os direitos desta edição ainda não foram avaliados para narração.");
  if (
    (start !== undefined && (!Number.isInteger(start) || start < 0)) ||
    (end !== undefined && (start === undefined || !Number.isInteger(end) || end < start))
  )
    throw new Error("Intervalo de versículos inválido.");
  const chapterUnits = await ScriptureRepository.loadEditionTextUnits(bookId, chapter, editionId);
  if (
    (start !== undefined && !chapterUnits.some((unit) => unit.ref.verseStart === start)) ||
    (end !== undefined && !chapterUnits.some((unit) => unit.ref.verseStart === end))
  )
    throw new Error("Um dos versículos selecionados não existe nesta edição.");
  const units = chapterUnits.filter(
    (unit) =>
      (start === undefined || (unit.ref.verseStart ?? -1) >= start) &&
      (end === undefined
        ? start === undefined || unit.ref.verseStart === start
        : (unit.ref.verseStart ?? Infinity) <= end),
  );
  if (!units.length)
    throw new Error("Texto não disponível nesta edição. Nenhuma outra tradução foi substituída.");
  const label = `${bookLabel(book.id, book.name)} ${chapter}${start !== undefined ? `:${start}${end !== undefined && end !== start ? `–${end}` : ""}` : ""}`;
  return createAudioItem({
    title: `${label} · ${edition.abbreviation}`,
    language: edition.language,
    text: units.map((unit) => unit.text).join("\n\n"),
    source: {
      kind: "scripture",
      bookId,
      chapter,
      editionId,
      ...(start !== undefined ? { verseStart: start } : {}),
      ...(end !== undefined ? { verseEnd: end } : {}),
      anchors: units.map((unit) => ({
        kind: "text-unit",
        workId: unit.ref.workId ?? `work:${bookId}`,
        ...(edition.corpusId ? { corpusId: edition.corpusId } : {}),
        editionId,
        versificationSchemeId: passageRefScheme(unit.ref),
        startUnitId: unit.id,
      })),
      attribution: edition.title,
      licenseId: edition.licenseId,
    },
  });
}
