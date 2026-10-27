import type { ReactNode } from "react";

/** The page every printout shares: what it is, its title, the content and where it came from. */
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
  return (
    <article className="pd" lang="pt-BR">
      <header className="pd-header">
        <p className="pd-kind">{kind}</p>
        <h1 className="pd-title">{title}</h1>
        {subtitle && <div className="pd-subtitle">{subtitle}</div>}
      </header>
      {children}
      <footer className="pd-footer">
        {notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p>
          Scriptorium · impresso em{" "}
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(printedAt)}
        </p>
      </footer>
    </article>
  );
}

/** A titled part of a printout; empty parts are left out by the caller, not printed blank. */
export function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pd-section">
      <h2 className="pd-heading">{title}</h2>
      {children}
    </section>
  );
}
