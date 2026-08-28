export const DEFAULT_LOCALE = "pt-BR" as const;

export type AppLocale = typeof DEFAULT_LOCALE;

export type TextDirection = "ltr" | "rtl";

export const DOCUMENT_LANGUAGE_CODES = ["pt-BR", "en", "grc", "he", "hbo", "arc", "la"] as const;

export function textDirectionForLanguage(language: string): TextDirection {
  return language === "he" || language === "hbo" || language === "arc" ? "rtl" : "ltr";
}
