export type StudyTextRole =
  | "continuation"
  | "question"
  | "article"
  | "objections"
  | "counterargument"
  | "answer"
  | "reply"
  | "chapter"
  | "paragraph";
export interface StudyTextSection {
  start: number;
  end: number;
  role: StudyTextRole;
}
export const STUDY_TEXT_LABELS: Record<StudyTextRole, string> = {
  continuation: "Continuação da fonte — consulte as páginas vizinhas",
  question: "Questão",
  article: "Artigo",
  objections: "Objeções — não são a conclusão do autor",
  counterargument: "Em contrário",
  answer: "Resposta / solução do autor",
  reply: "Resposta às objeções",
  chapter: "Capítulo da obra",
  paragraph: "Parágrafo / artigo confessional",
};
const PROFILES: Record<string, "summa" | "institutes" | "confessional"> = {
  bce9882610a0564144fdd1fb2ced480a1c25a30db48b4cbb004958d16034fbed: "summa",
  "3a1ec505530e29550ac4d735a63d81854c6c75b548a1e9f19a93468e99fe063d": "institutes",
  "17a34221d239025a27503c061c0ce69b5bf3da1c8b5e35767f0b56c4de05d332": "confessional",
  f6f4069eaadc0f2070a16665b4e70562df30d1ee7d93019496ad7bdf7d178351: "confessional",
  "3e96a03b674d9c78acaf7e9d15608cf3ae56c1e9190b79777acde87cb77f11e6": "confessional",
};
/** Exact offsets; headings in this page are not an assertion of complete cross-page structure. */
export function structuredStudyText(documentId: string, text: string): StudyTextSection[] {
  const profile = PROFILES[documentId.replace(/^private-document:/u, "")];
  if (!profile) return [];
  const points: { start: number; role: StudyTextRole }[] = [];
  for (const match of text.matchAll(/^.*$/gmu)) {
    const line = match[0].trim();
    let role: StudyTextRole | undefined;
    if (profile === "summa") {
      if (/^Questão\s+\d+/iu.test(line)) role = "question";
      else if (/^Art\.\s*\d+/u.test(line)) role = "article";
      else if (/discute-se assim|^OBJE[ÇC][ÕO]ES/u.test(line)) role = "objections";
      else if (/^Mas,?\s+em contr[áa]rio/iu.test(line)) role = "counterargument";
      else if (/^SOLU[ÇC][ÃA]O[.\s]/u.test(line)) role = "answer";
      else if (
        /^(?:DONDE\s+A\s+)?RESPOSTA\s+[ÀA]S?\s+(?:OBJE|PRIMEIRA|SEGUNDA|TERCEIRA)/u.test(line)
      )
        role = "reply";
    } else if (profile === "institutes") {
      if (/^C\s*A\s*P\s*[ÍI]\s*T\s*U\s*L\s*O\s+[IVX]+/u.test(line)) role = "chapter";
      else if (/^\d+\.\s+\p{Lu}/u.test(line)) role = "paragraph";
    } else if (
      profile === "confessional" &&
      /^(?:ARTIGO\s+\d+|CAP[ÍI]TULO\s+[IVX]+|\d{1,4}\.\s+\p{Lu})/u.test(line)
    )
      role = "paragraph";
    if (role) points.push({ start: match.index, role });
  }
  if (!points.length) return [];
  if (points[0]!.start > 0) points.unshift({ start: 0, role: "continuation" });
  return points.map((p, i) => ({ ...p, end: points[i + 1]?.start ?? text.length }));
}
