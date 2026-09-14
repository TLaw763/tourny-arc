import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureCalendarGrid } from "@/components/fixture-calendar-grid";
import {
  getPublicCalendarFixtures,
  getPublicSeason,
  mapPublicCalendarFixtures,
} from "@/lib/queries";
import { requireSelectedSeasonId } from "@/lib/selected-season";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const params = await searchParams;
  const seasonId = await requireSelectedSeasonId(params.seasonId);
  const tournament = await getPublicSeason(seasonId);
  if (!tournament) notFound();

  const calendarFixtures = mapPublicCalendarFixtures(await getPublicCalendarFixtures(seasonId));
  const seasonLabel = `${tournament.competitionName} — ${tournament.seasonName}`;

  return (
    <div className="calendar-page space-y-6">
      <div className="space-y-2">
        <Link href="/" className="text-sm">
          ← All tournaments
        </Link>
        <div className="fixtures-schedule-header">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{seasonLabel}</p>
          </div>
          <Link href={`/seasons/${seasonId}/schedule`} className="text-sm font-medium">
            Fixtures list
          </Link>
        </div>
      </div>

      {calendarFixtures.filter((f) => f.confirmed_start_at).length > 0 ? (
        <FixtureCalendarGrid fixtures={calendarFixtures} />
      ) : (
        <p className="text-[var(--color-text-muted)]">No confirmed fixtures on the calendar yet.</p>
      )}
    </div>
  );
}
