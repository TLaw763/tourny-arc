"use client";

import Link from "next/link";
import { FixtureStateBadge } from "@/components/fixture-state-badge";
import { RoundCollapsibleSection } from "@/components/round-collapsible-section";
import { groupFixturesByRound } from "@/lib/fixture-display";

export type FixtureRoundListItem = {
  id: string;
  round_id?: string | null;
  state: string;
  confirmed_start_at: string | null;
  participant_a_name: string;
  participant_b_name: string;
  match_outcome?: string | null;
  is_bye?: boolean;
};

export type RoundListItem = {
  id: string;
  label: string;
  sequence: number;
};

export function FixturesByRoundList({
  rounds,
  fixtures,
  unscheduledOnly = false,
}: {
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
              <ul className="fixture-round-list space-y-2">
                {roundFixtures.map((fixture) => {
                  const start = fixture.confirmed_start_at
                    ? new Date(fixture.confirmed_start_at).toLocaleString()
                    : null;
                  return (
                    <li key={fixture.id} className="fixture-round-list-item panel p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <Link href={`/fixtures/${fixture.id}`} className="font-medium">
                            {fixture.participant_a_name} vs {fixture.participant_b_name}
                          </Link>
                          {start && (
                            <p className="text-xs text-[var(--color-text-muted)]">{start}</p>
                          )}
                        </div>
                        <FixtureStateBadge
                          state={fixture.state}
                          confirmedStartAt={fixture.confirmed_start_at}
                          matchOutcome={fixture.match_outcome}
                          participantAName={fixture.participant_a_name}
                          participantBName={fixture.participant_b_name}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </RoundCollapsibleSection>
        );
      })}
    </div>
  );
}
