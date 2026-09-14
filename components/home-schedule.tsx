import { FixturesSchedulePanel } from "@/components/fixtures-schedule-panel";
import type { PublicScheduleFixture } from "@/lib/queries";

type HomeScheduleProps = {
  seasonId: string;
  seasonLabel: string;
  calendarFixtures: PublicScheduleFixture[];
  listFixtures: PublicScheduleFixture[];
  rounds: Array<{ id: string; label: string; sequence: number }>;
};

export function HomeSchedule({
  seasonId,
  seasonLabel,
  calendarFixtures,
  listFixtures,
  rounds,
}: HomeScheduleProps) {
  return (
    <FixturesSchedulePanel
      seasonId={seasonId}
      seasonLabel={seasonLabel}
      listFixtures={listFixtures}
      calendarFixtures={calendarFixtures}
      rounds={rounds}
    />
  );
}
