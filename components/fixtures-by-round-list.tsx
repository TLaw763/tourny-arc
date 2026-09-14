"use client";

import { FixtureMatchupRow } from "@/components/fixture-matchup-row";
import { RoundCollapsibleSection } from "@/components/round-collapsible-section";
import { groupFixturesByRound } from "@/lib/fixture-display";
import type { PublicScheduleFixture } from "@/lib/queries";

export type FixtureRoundListItem = PublicScheduleFixture & {
  is_bye?: boolean;
};

export type RoundListItem = {
  id: string;
  label: string;
  sequence: number;
};

export function FixturesByRoundList({
  seasonId,
  rounds,
  fixtures,
  unscheduledOnly = false,
}: {
  seasonId: string;
  rounds: RoundListItem[];
  fixtures: FixtureRoundListItem[];
  /** When true, only rounds with no scheduled fixtures (calendar companion). */
  unscheduledOnly?: boolean;
}) {
  const groups = groupFixturesByRound(rounds, fixtures).filter(({ fixtures: roundFixtures }) => {
    if (!unscheduledOnly) return true;
    if (roundFixtures.length === 0) return true;
    return roundFixtures.every((f) => !f.confirmed_start_at);
  });

  if (groups.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)]">
        {unscheduledOnly ? "All rounds are scheduled." : "No rounds yet."}
      </p>
    );
  }

  return (
    <div className="fixture-round-groups space-y-3">
      {groups.map(({ round, fixtures: roundFixtures }, index) => {
        const scheduledCount = roundFixtures.filter((f) => f.confirmed_start_at).length;
        return (
          <RoundCollapsibleSection
            key={round.id}
            roundLabel={round.label}
            fixtureCount={roundFixtures.length}
            scheduledCount={scheduledCount}
            defaultOpen={unscheduledOnly ? index === 0 : index === 0}
          >
            {roundFixtures.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Matchups for this round have not been generated yet.
              </p>
            ) : (
              <div className="fixtures-round-matchups">
                {roundFixtures.map((fixture) => (
                  <FixtureMatchupRow key={fixture.id} fixture={fixture} seasonId={seasonId} />
                ))}
              </div>
            )}
          </RoundCollapsibleSection>
        );
      })}
    </div>
  );
}
