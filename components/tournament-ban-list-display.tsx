import { formatBanListEntryLabel } from "@/lib/ban-list-display";
import {
  BAN_LIST_CATEGORIES,
  BAN_LIST_CATEGORY_LABELS,
  groupBanListByCategory,
} from "@/lib/domain/ban-list";
import type { SeasonBanListEntry } from "@/lib/domain/types";

type TournamentBanListDisplayProps = {
  entries: SeasonBanListEntry[];
  id?: string;
  showWhenEmpty?: boolean;
};

export function TournamentBanListDisplay({
  entries,
  id,
  showWhenEmpty = false,
}: TournamentBanListDisplayProps) {
  if (entries.length === 0 && !showWhenEmpty) return null;

  const grouped = groupBanListByCategory(entries);

  return (
    <section id={id} className="panel-subtle space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Tournament ban list</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Event-specific card limits for this tournament.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          No ban list has been configured for this tournament yet.
        </p>
      ) : (
      <div className="ban-list-grid">
        {BAN_LIST_CATEGORIES.map((section) => (
          <div key={section} className="ban-list-section">
            <h3 className="ban-list-section-title">
              {BAN_LIST_CATEGORY_LABELS[section]}
              <span className="ban-list-section-count">{grouped[section].length}</span>
            </h3>
            {grouped[section].length === 0 ? (
              <p className="ban-list-empty">—</p>
            ) : (
              <ul className="ban-list-items ban-list-items--readonly">
                {grouped[section].map((entry) => (
                  <li key={entry.id}>{formatBanListEntryLabel(entry)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
