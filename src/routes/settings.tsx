import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useWorkbench, type ThemeMode } from "../lib/workbench/workbench-context";
import { DEFAULT_LOCALE, formatDecimal, languageLabel, t } from "../lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: t("settings.metaTitle") }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme, readingPrefs, setReadingPrefs, setPassageContext } = useWorkbench();
  useEffect(() => setPassageContext(null), [setPassageContext]);
  return (
    <div className="mx-auto max-w-3xl px-5 py-6 md:px-8">
      <header className="border-b border-border pb-3">
        <p className="meta-label">{t("settings.section")}</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">{t("settings.preferences")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("settings.localNotice")}</p>
      </header>
      <SettingSection title={t("settings.appearance")}>
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              aria-pressed={theme === mode}
              className={`rounded-md border px-3 py-1.5 text-xs capitalize ${theme === mode ? "border-primary bg-accent" : "border-input"}`}
            >
              {mode === "light"
                ? t("settings.light")
                : mode === "dark"
                  ? t("settings.dark")
                  : t("settings.system")}
            </button>
          ))}
        </div>
      </SettingSection>
      <SettingSection title={t("settings.reading")}>
        <label className="block text-xs">
          <span className="flex justify-between">
            <span>{t("settings.fontSize")}</span>
            <span className="font-mono text-muted-foreground">
              {formatDecimal(readingPrefs.fontSize)} rem
            </span>
          </span>
          <input
            type="range"
            min="0.9"
            max="1.6"
            step="0.05"
            value={readingPrefs.fontSize}
            onChange={(e) => setReadingPrefs({ fontSize: Number(e.target.value) })}
            className="mt-2 w-full"
          />
        </label>
        <label className="mt-4 block text-xs">
          <span className="flex justify-between">
            <span>{t("settings.lineHeight")}</span>
            <span className="font-mono text-muted-foreground">
              {formatDecimal(readingPrefs.lineHeight)}
            </span>
          </span>
          <input
            type="range"
            min="1.3"
            max="2.3"
            step="0.05"
            value={readingPrefs.lineHeight}
            onChange={(e) => setReadingPrefs({ lineHeight: Number(e.target.value) })}
            className="mt-2 w-full"
          />
        </label>
        <div className="mt-4 flex gap-2">
          {(["verse", "paragraph"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setReadingPrefs({ verseMode: mode })}
              className={`rounded-md border px-3 py-1.5 text-xs capitalize ${readingPrefs.verseMode === mode ? "border-primary bg-accent" : "border-input"}`}
            >
              {mode === "verse" ? t("settings.verse") : t("settings.paragraph")}
            </button>
          ))}
        </div>
      </SettingSection>
      <SettingSection title={t("settings.language")}>
        <dl className="grid gap-2 text-xs sm:grid-cols-[150px_1fr]">
          <dt className="text-muted-foreground">{t("settings.interfaceLanguage")}</dt>
          <dd>{languageLabel(DEFAULT_LOCALE)}</dd>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{t("settings.defaultLocale")}</p>
      </SettingSection>
      <SettingSection title={t("settings.resources")}>
        <p className="text-sm text-muted-foreground">{t("settings.resourcesNotice")}</p>
      </SettingSection>
      <SettingSection title={t("settings.assistant")}>
        <dl className="grid gap-2 text-xs sm:grid-cols-[150px_1fr]">
          <dt className="text-muted-foreground">{t("common.status")}</dt>
          <dd>{t("common.disabled")}</dd>
          <dt className="text-muted-foreground">{t("settings.futureProviders")}</dt>
          <dd>Ollama · OpenAI-compatible</dd>
          <dt className="text-muted-foreground">{t("settings.rule")}</dt>
          <dd>{t("settings.aiRule")}</dd>
        </dl>
      </SettingSection>
    </div>
  );
}
function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-border py-5 sm:grid-cols-[150px_1fr]">
      <h2 className="meta-label">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
