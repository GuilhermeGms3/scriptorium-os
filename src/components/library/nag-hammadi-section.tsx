import {
  NAG_HAMMADI_CODICES,
  NAG_HAMMADI_RIGHTS_NOTE,
} from "../../lib/content/nag-hammadi-catalog";
import { NagHammadiLocator } from "./nag-hammadi-locator";

/** The documentary catalog of the 13 codices; installed texts open, the rest are located. */
export function NagHammadiSection({ installedWorkIds }: { installedWorkIds: ReadonlySet<string> }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        13 códices · 52 testemunhos textuais · 1 texto-fonte instalado
      </p>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {NAG_HAMMADI_RIGHTS_NOTE}
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {NAG_HAMMADI_CODICES.map(({ codex, tractates }) => (
          <section key={codex} className="rounded-md border border-border p-3">
            <h3 className="meta-label">Códice {codex}</h3>
            <ol className="mt-2 space-y-1.5">
              {tractates.map((tractate) => {
                const installed = Boolean(
                  tractate.installedWorkId && installedWorkIds.has(tractate.installedWorkId),
                );
                return (
                  <li key={tractate.id}>
                    {installed && tractate.installedWorkId ? (
                      <a
                        href={`/library/read/${encodeURIComponent(tractate.installedWorkId)}`}
                        className="flex items-baseline justify-between gap-2 text-sm text-primary hover:underline"
                      >
                        <span>
                          {tractate.order}. {tractate.title}
                        </span>
                        <span className="text-xs text-muted-foreground">texto copta</span>
                      </a>
                    ) : (
                      <NagHammadiLocator tractate={tractate} />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
