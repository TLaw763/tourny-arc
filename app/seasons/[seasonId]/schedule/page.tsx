import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HomeSchedule } from "@/components/home-schedule";
import {
  getPublicScheduleFixtures,
  getPublicSeason,
  getPublicSeasonRounds,
  mapPublicCalendarFixtures,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SeasonSchedulePage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const tournament = await getPublicSeason(seasonId);
  if (!tournament) notFound();

  const [listFixtures, rounds] = await Promise.all([
    mapPublicCalendarFixtures(await getPublicScheduleFixtures(seasonId)),
    getPublicSeasonRounds(seasonId),
  ]);

  const seasonLabel = `${tournament.competitionName} — ${tournament.seasonName}`;

  return (
    <Suspense fallback={<p>Loading schedule…</p>}>
      <HomeSchedule
        seasonId={seasonId}
        seasonLabel={seasonLabel}
        listFixtures={listFixtures}
        rounds={rounds}
      />
    </Suspense>
  );
}
