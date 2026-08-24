/**
 * ResearchAssistant — preparation UI only. No LLM is wired up; no API key
 * is required. The panel makes the AI-assisted contract visible: optional,
 * local-first, and always traceable to sources.
 */

import { Bot, Check } from "lucide-react";

export function ResearchAssistant({ contextLabel }: { contextLabel?: string }) {
  return (
    <section
      aria-label="Research Assistant"
      className="rounded-lg border border-dashed border-border bg-muted/20 p-3"
    >
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <h3 className="text-[13px] font-medium">Research Assistant</h3>
        <span className="rounded border border-border px-1 py-px font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
          preview
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] text-muted-foreground">
        Ask about {contextLabel ?? "this passage"}…
      </div>

      <fieldset className="mt-2.5 space-y-1">
        <legend className="meta-label">Context</legend>
        {[
          { label: "Current passage", on: true },
          { label: "Selected resources", on: true },
          { label: "Personal notes", on: true },
          { label: "Entire library", on: false },
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
        <span className="meta-label">Provider</span>
        <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          Local model (Ollama) — not configured
        </span>
      </div>

      <p className="mt-2.5 border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
        AI-generated analysis must remain traceable to the sources used. The assistant is a
        research tool, never an authority.
      </p>
    </section>
  );
}
