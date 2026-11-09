/** Decorative assembly, not a fabricated progress percentage. Results never wait for animation. */
export function HebrewSearchMark({
  active,
  label,
  cycle,
}: {
  active: boolean;
  label: string;
  cycle: string | number;
}) {
  return (
    <div className="hebrew-search-mark" data-active={active || undefined}>
      <span className="hebrew-search-word" dir="rtl" lang="he" aria-hidden="true" key={cycle}>
        {["דַּ", "עַ", "ת"].map((letter, index) => (
          <span
            className="hebrew-search-letter"
            key={index}
            style={{ animationDelay: `${index * 140}ms` }}
          >
            {letter}
          </span>
        ))}
      </span>
      <span role="status" className="text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
