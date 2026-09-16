const HEBREW_MARKS = /[\u0591-\u05BD\u05BF-\u05C7]/g;
const GREEK_MARKS = /[\u0300-\u036f]/g;

export function normalizeSearchText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("und").replace(/\s+/g, " ").trim();
}

export function normalizeGreekSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(GREEK_MARKS, "")
    .replace(/ς/g, "σ")
    .toLocaleLowerCase("el")
    .normalize("NFC");
}

export function normalizeHebrewConsonants(value: string): string {
  return value.normalize("NFD").replace(HEBREW_MARKS, "").normalize("NFC");
}

export function buildSearchNormalization(value: string, language?: string): string {
  const base = normalizeSearchText(value);
  if (language === "grc" || /[\u0370-\u03ff\u1f00-\u1fff]/.test(value)) {
    return `${base} ${normalizeGreekSearch(value)}`.trim();
  }
  if (language === "he" || language === "hbo" || /[\u0590-\u05ff]/.test(value)) {
    return `${base} ${normalizeHebrewConsonants(value)}`.trim();
  }
  return base.normalize("NFD").replace(GREEK_MARKS, "").normalize("NFC");
}

export function toSafeFtsQuery(value: string): string {
  const terms = buildSearchNormalization(value)
    .split(/[^\p{L}\p{N}:]+/u)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 12);
  return terms.map((term) => `"${term.replaceAll('"', '""')}"*`).join(" AND ");
}
