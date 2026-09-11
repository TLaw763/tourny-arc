import Link from "next/link";
import { FixtureStateBadge } from "@/components/fixture-state-badge";

export type UpcomingFixtureItem = {
  id: string;
  state: string;
  confirmed_start_at: string;
  participant_a_name: string;
  participant_b_name: string;
  match_outcome?: string | null;
  round_label?: string | null;
};

export function UpcomingFixturesList({ fixtures }: { fixtures: UpcomingFixtureItem[] }) {
  if (fixtures.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No upcoming confirmed fixtures yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {fixtures.map((fixture) => (
        <li key={fixture.id} className="panel-subtle p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <Link href={`/fixtures/${fixture.id}`} className="font-medium">
                {fixture.participant_a_name} vs {fixture.participant_b_name}
              </Link>
              <p className="text-xs text-[var(--color-text-muted)]">
                {new Date(fixture.confirmed_start_at).toLocaleString()}
                {fixture.round_label ? ` · ${fixture.round_label}` : ""}
              </p>
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
      ))}
    </ul>
  );
}
