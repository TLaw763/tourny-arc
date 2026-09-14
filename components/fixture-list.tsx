import { FixturesByRoundList } from "@/components/fixtures-by-round-list";
import type { PublicScheduleFixture } from "@/lib/queries";

export type FixtureListItem = PublicScheduleFixture;

export function FixtureList({
  seasonId,
  fixtures,
  rounds,
  unscheduledOnly = false,
}: {
  seasonId: string;
  fixtures: FixtureListItem[];
  rounds: Array<{ id: string; label: string; sequence: number }>;
  unscheduledOnly?: boolean;
}) {
  return (
    <FixturesByRoundList
      seasonId={seasonId}
      rounds={rounds}
      fixtures={fixtures}
      unscheduledOnly={unscheduledOnly}
    />
  );
}
