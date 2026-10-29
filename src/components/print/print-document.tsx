import type { ReactNode } from "react";
import { t } from "../../lib/i18n";

/** The "book-marked" mark of the top bar (lucide, ISC), with its ribbon in the logo's gold. */
function ScriptoriumMark({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="pd-mark-book"
        d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
      />
      <path className="pd-mark-ribbon" d="M10 2v8l3-3 3 3V2" />
    </svg>
  );
}

/** A gold rule with a diamond in the middle, as under the title. */
export function PrintOrnament() {
  return (
    <div className="pd-ornament" aria-hidden="true">
      <span />
      <i />
      <span />
    </div>
  );
}

/**
 * The page every printout shares, in Scriptorium's identity: warm paper with a gold frame and the
 * mark as a watermark, the logo and the document's name at the top of every page, the motto and the
 * date at the bottom, and a centered title over the old scripts of the opening screen.
 *
 * The paper, header and footer are fixed elements, which browsers repeat on every printed page;
 * the table's header and footer rows (also repeated) keep the text clear of them on every page.
 */
export function PrintDocument({
  kind,
  title,
  subtitle,
  notes = [],
  printedAt = new Date(),
  children,
}: {
  /** What is being printed: "Estudo", "Nota", "Leitura bíblica". */
  kind: string;
  title: string;
  subtitle?: ReactNode;
  /** Credits and cautions printed at the end: edition, license, how comments were linked. */
  notes?: readonly string[];
  printedAt?: Date;
  children: ReactNode;
}) {
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(printedAt);
  return (
    <div className="pd-page" lang="pt-BR">
      <div className="pd-sheet" aria-hidden="true">
        <div className="pd-frame">
          <i className="pd-corner pd-corner-tl" />
          <i className="pd-corner pd-corner-tr" />
          <i className="pd-corner pd-corner-bl" />
          <i className="pd-corner pd-corner-br" />
        </div>
        <ScriptoriumMark className="pd-watermark" />
      </div>
      <div className="pd-running-header" aria-hidden="true">
        <span className="pd-brand">
          <ScriptoriumMark className="pd-brand-mark" />
          SCRIPTORIUM
        </span>
        <span className="pd-running-title">
          {kind} · {title}
        </span>
      </div>
      <div className="pd-running-footer">
        <span className="pd-motto">{t("about.tagline")}</span>
        <span>impresso em {date}</span>
      </div>
      <table className="pd-flow" role="presentation">
        <thead>
          <tr>
            <td>
              <div className="pd-space-top" />
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td>
              <div className="pd-space-bottom" />
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
              <article className="pd">
                <header className="pd-title-block">
                  <p className="pd-scripts pd-scripts-he" dir="rtl" lang="he" aria-hidden="true">
                    בְּרֵאשִׁית בָּרָא אֱלֹהִים
                  </p>
                  <p className="pd-kind">{kind}</p>
                  <h1 className="pd-title">{title}</h1>
                  {subtitle && <div className="pd-subtitle">{subtitle}</div>}
                  <PrintOrnament />
                  <p className="pd-scripts pd-scripts-el" lang="grc" aria-hidden="true">
                    Ἐν ἀρχῇ ἦν ὁ λόγος
                  </p>
                </header>
                {children}
                {notes.length > 0 && (
                  <footer className="pd-colophon">
                    <PrintOrnament />
                    {notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </footer>
                )}
              </article>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** A titled part of a printout; empty parts are left out by the caller, not printed blank. */
export function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pd-section">
      <h2 className="pd-heading">
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}
