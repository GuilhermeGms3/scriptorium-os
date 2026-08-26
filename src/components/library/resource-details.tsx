/**
 * ResourceDetails — full metadata for a catalog entry, including license,
 * which governs whether the resource may be redistributed at all.
 */

import { useWorkbench } from "../../lib/workbench/workbench-context";
import type { LibraryResource } from "../../lib/domain/library";
import { RESOURCE_TYPE_LABELS } from "../../lib/repositories/library-repository";

export function ResourceDetails({ resource }: { resource: LibraryResource }) {
  const { studies, addToStudy } = useWorkbench();
  const lic = resource.license;

  return (
    <div className="px-4 py-4">
      <p className="meta-label">{RESOURCE_TYPE_LABELS[resource.type]}</p>
      <h2 className="mt-1 font-serif text-lg font-semibold leading-tight">{resource.title}</h2>
      {resource.author && <p className="mt-0.5 text-sm text-muted-foreground">{resource.author}</p>}

      {resource.description && (
        <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">{resource.description}</p>
      )}

      <dl className="mt-4 space-y-1.5">
        <Row label="Language" value={resource.language} />
        <Row label="Year" value={resource.year?.toString()} />
        <Row label="Publisher" value={resource.publisher} />
        <Row label="Availability" value={resource.availability} />
        <Row label="Indexing" value={resource.indexingStatus} />
        <Row label="Tags" value={resource.tags.join(", ")} />
      </dl>

      <section className="mt-4 rounded-md border border-border bg-muted/30 p-2.5">
        <p className="meta-label">License</p>
        {lic ? (
          <dl className="mt-1.5 space-y-1">
            <Row label="Name" value={lic.name} />
            <Row label="Holder" value={lic.copyrightHolder} />
            <Row label="Redistribution" value={lic.redistributionAllowed ? "allowed" : "not allowed"} />
            <Row
              label="Commercial"
              value={
                lic.commercialUseAllowed === undefined
                  ? "unspecified"
                  : lic.commercialUseAllowed
                    ? "allowed"
                    : "not allowed"
              }
            />
            <Row label="Attribution" value={lic.attributionRequired ? "required" : "not required"} />
          </dl>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground italic">No license metadata recorded.</p>
        )}
        {lic?.attributionText && (
          <p className="mt-2 border-t border-border pt-1.5 text-[11px] italic text-muted-foreground">
            {lic.attributionText}
          </p>
        )}
      </section>

      {studies.length > 0 && (
        <label className="mt-4 flex items-center gap-2">
          <span className="meta-label">Link to study</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              addToStudy(e.target.value, {
                kind: "resource",
                refId: resource.id,
                label: resource.title,
              });
              e.target.value = "";
            }}
            className="h-7 flex-1 rounded-md border border-input bg-background px-1.5 text-xs"
          >
            <option value="" disabled>
              Choose a study…
            </option>
            {studies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[13px]">
      <dt className="w-24 shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}
