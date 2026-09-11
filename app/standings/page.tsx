import Link from "next/link";
import { redirect } from "next/navigation";
import { StandingsTable } from "@/components/standings-table";
import { getPublicSeason, getPublicStandingsEnriched } from "@/lib/queries";
import { resolvePublicSeasonId } from "@/lib/selected-season";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const { seasonId: seasonIdParam } = await searchParams;
  const seasonId = await resolvePublicSeasonId(seasonIdParam);

  if (!seasonId) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm">
          ← All tournaments
        </Link>
        <p className="text-[var(--color-text-muted)]">No public tournaments yet.</p>
      </div>
    );
  }

  if (!seasonIdParam || seasonIdParam !== seasonId) {
    redirect(`/standings?seasonId=${seasonId}`);
  }

  const [standings, tournament] = await Promise.all([
    getPublicStandingsEnriched(seasonId),
    getPublicSeason(seasonId),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm">
        ← All tournaments
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Standings</h1>
        {tournament && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {tournament.competitionName} — {tournament.seasonName}
          </p>
        )}
      </div>
      <StandingsTable rows={standings} seasonId={seasonId} />
    </div>
  );
}
