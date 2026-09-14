import Link from "next/link";
import { notFound } from "next/navigation";
import { StandingsTable } from "@/components/standings-table";
import { TournamentBanListDisplay } from "@/components/tournament-ban-list-display";
import { TournamentHero } from "@/components/tournament-hero";
import { UpcomingFixturesList } from "@/components/upcoming-fixtures-list";
import { getSeasonBanListWithPlatformDefaults } from "@/lib/ban-list/apply-reference";
import {
  getPublicSeason,
  getPublicStandingsEnriched,
  getPublicUpcomingFixtures,
  mapPublicCalendarFixtures,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SeasonHomePage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const tournament = await getPublicSeason(seasonId);
  if (!tournament) notFound();

  const [standings, upcomingRaw, banList] = await Promise.all([
    getPublicStandingsEnriched(seasonId),
    getPublicUpcomingFixtures(seasonId, 5),
    getSeasonBanListWithPlatformDefaults(seasonId),
  ]);
  const upcoming = mapPublicCalendarFixtures(upcomingRaw).filter(
    (f): f is typeof f & { confirmed_start_at: string } => !!f.confirmed_start_at,
  );

  return (
    <div className="tournament-page space-y-8">
      <TournamentHero tournament={tournament} />

      <div className="tournament-page-content space-y-8">
        <Link href="/" className="text-sm">
          ← All tournaments
        </Link>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/seasons/${seasonId}/schedule`} className="btn-secondary no-underline">
            Fixtures
          </Link>
          <Link href={`/standings?seasonId=${seasonId}`} className="btn-secondary no-underline">
            Standings
          </Link>
          <Link href={`/seasons/${seasonId}/ban-list`} className="btn-secondary no-underline">
            Ban list
          </Link>
        </div>

        <div className="tournament-page-columns">
          <section className="panel-subtle tournament-page-column">
            <h2 className="border-b border-[var(--color-border)] p-3 text-lg font-semibold">
              Standings
            </h2>
            <div className="p-3">
              <StandingsTable rows={standings} seasonId={seasonId} />
            </div>
          </section>
          <section className="panel-subtle tournament-page-column">
            <h2 className="border-b border-[var(--color-border)] p-3 text-lg font-semibold">
              Upcoming matches
            </h2>
            <div className="p-3">
              <UpcomingFixturesList fixtures={upcoming} />
            </div>
          </section>
        </div>

        <TournamentBanListDisplay entries={banList} id="ban-list" />
      </div>
    </div>
  );
}
