import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentBanListDisplay } from "@/components/tournament-ban-list-display";
import { getSeasonBanListWithPlatformDefaults } from "@/lib/ban-list/apply-reference";
import { getPublicSeason } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SeasonBanListPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const tournament = await getPublicSeason(seasonId);
  if (!tournament) notFound();

  const banList = await getSeasonBanListWithPlatformDefaults(seasonId);

  return (
    <div className="space-y-6">
      <Link href={`/seasons/${seasonId}`} className="text-sm">
        ← {tournament.competitionName} — {tournament.seasonName}
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Ban list</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {tournament.competitionName} · {tournament.seasonName}
        </p>
      </div>

      <TournamentBanListDisplay entries={banList} showWhenEmpty />
    </div>
  );
}
