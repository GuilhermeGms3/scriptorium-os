import type { StudyFoundation as Foundation } from "../../lib/domain/study-foundation";
import "./study-foundation.css";

export function StudyFoundation({ records }: { records: readonly Foundation[] }) {
  if (!records.length) return null;
  return (
    <details className="study-foundation">
      <summary>
        Fundamentação{" "}
        <span>{records.length === 1 ? records[0]!.area : `${records.length} recortes`}</span>
      </summary>
      {records.map((record) => (
        <section key={record.claim} className="study-foundation-record">
          <p className="study-foundation-kind">
            {record.area} · {record.status}
          </p>
          <h3>{record.claim}</h3>
          <p>{record.basis}</p>
          {record.sources.map((source) => (
            <article key={`${source.url}:${source.locator}`}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title} ↗
              </a>
              <p className="study-foundation-locator">{source.locator}</p>
              <p>{source.supports}</p>
              <p className="study-foundation-limit">
                <strong>Alcance:</strong> {source.limit}
              </p>
              <small>{source.perspective}</small>
            </article>
          ))}
          <h4>Perspectivas e limites</h4>
          <p>{record.alternatives}</p>
        </section>
      ))}
    </details>
  );
}
