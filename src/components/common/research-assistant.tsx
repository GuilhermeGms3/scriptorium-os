/**
 * ResearchAssistant — preparation UI only. No LLM is wired up; no API key
 * is required. The panel makes the AI-assisted contract visible: optional,
 * local-first, and always traceable to sources.
 */

import { Bot, Check } from "lucide-react";
import { t } from "../../lib/i18n";

export function ResearchAssistant({ contextLabel }: { contextLabel?: string }) {
  return (
    <section
      aria-label={t("assistant.label")}
      className="rounded-lg border border-dashed border-border bg-muted/20 p-3"
    >
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <h3 className="text-[13px] font-medium">{t("assistant.label")}</h3>
        <span className="rounded border border-border px-1 py-px font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
          {t("assistant.preview")}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-muted-foreground">
        {t("assistant.ask", { context: contextLabel ?? t("assistant.thisPassage") })}
      </div>

      <fieldset className="mt-2.5 space-y-1">
        <legend className="meta-label">{t("assistant.context")}</legend>
        {[
          { label: t("assistant.currentPassage"), on: true },
          { label: t("assistant.selectedResources"), on: true },
          { label: t("assistant.personalNotes"), on: true },
          { label: t("assistant.entireLibrary"), on: false },
        ].map((c) => (
          <label key={c.label} className="flex items-center gap-2 text-xs text-foreground/85">
            <span
              className={`flex size-3.5 items-center justify-center rounded-sm border ${c.on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
              aria-hidden
            >
              {c.on && <Check className="size-2.5" />}
            </span>
            {c.label}
          </label>
        ))}
      </fieldset>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="meta-label">{t("assistant.provider")}</span>
        <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {t("assistant.localModel")}
        </span>
      </div>

      <p className="mt-2.5 border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("assistant.disclaimer")}
      </p>
    </section>
  );
}
