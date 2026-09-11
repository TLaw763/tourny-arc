"use client";

import type { ReactNode } from "react";

export function RoundCollapsibleSection({
  roundLabel,
  fixtureCount,
  scheduledCount = 0,
  defaultOpen = false,
  children,
}: {
  roundLabel: string;
  fixtureCount: number;
  scheduledCount?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const isUnscheduled = fixtureCount === 0 || scheduledCount === 0;
  const isPartial =
    fixtureCount > 0 && scheduledCount > 0 && scheduledCount < fixtureCount;

  const summary =
    fixtureCount === 0
      ? "No matchups generated yet"
      : isPartial
        ? `${fixtureCount} matchups · ${scheduledCount} scheduled`
        : `${fixtureCount} matchup${fixtureCount === 1 ? "" : "s"}`;

  return (
    <details className="round-collapsible panel-subtle" open={defaultOpen}>
      <summary className="round-collapsible-summary">
        <span className="round-collapsible-heading">
          <span className="font-semibold">{roundLabel}</span>
          {isUnscheduled && (
            <span className="fixture-state fixture-state--not-scheduled">Not scheduled</span>
          )}
          {!isUnscheduled && scheduledCount === fixtureCount && fixtureCount > 0 && (
            <span className="fixture-state fixture-state--scheduled">Scheduled</span>
          )}
          {isPartial && (
            <span className="fixture-state fixture-state--not-scheduled">Partially scheduled</span>
          )}
        </span>
        <span className="text-sm font-normal text-[var(--color-text-muted)]">{summary}</span>
      </summary>
      <div className="round-collapsible-body">{children}</div>
    </details>
  );
}
