import type { FormResult } from "@/lib/standings-display";

export function FormBadges({
  form,
  matchesPlayed,
  seasonTotalMatches,
  showProgress = true,
}: {
  form: FormResult[];
  matchesPlayed: number;
  seasonTotalMatches: number;
  showProgress?: boolean;
}) {
  const slots: Array<FormResult | null> = [
    ...form,
    ...Array(Math.max(0, 5 - form.length)).fill(null),
  ].slice(0, 5);

  const progressPct =
    seasonTotalMatches > 0
      ? Math.min(100, Math.round((matchesPlayed / seasonTotalMatches) * 100))
      : 0;

  return (
    <div className="form-badges">
      <div className="form-badges-row" aria-label="Last five results">
        {slots.map((result, index) => (
          <span
            key={index}
            className={
              result
                ? `form-badge form-badge--${result.toLowerCase()}`
                : "form-badge form-badge--empty"
            }
            title={result ?? "No result"}
          >
            {result ?? "·"}
          </span>
        ))}
      </div>
      {showProgress && seasonTotalMatches > 0 && (
        <div className="form-progress">
          <div className="form-progress-track">
            <div className="form-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="form-progress-label">
            {matchesPlayed}/{seasonTotalMatches}
          </span>
        </div>
      )}
    </div>
  );
}
