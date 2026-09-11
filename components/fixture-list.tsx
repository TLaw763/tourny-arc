import { FixturesByRoundList, type FixtureRoundListItem } from "@/components/fixtures-by-round-list";

export type FixtureListItem = FixtureRoundListItem & {
  round_label?: string | null;
  round_sequence?: number | null;
};

export function FixtureList({
  fixtures,
  rounds,
  unscheduledOnly = false,
}: {
  fixtures: FixtureListItem[];
  rounds: Array<{ id: string; label: string; sequence: number }>;
  unscheduledOnly?: boolean;
}) {
  return (
    <FixturesByRoundList rounds={rounds} fixtures={fixtures} unscheduledOnly={unscheduledOnly} />
  );
}
