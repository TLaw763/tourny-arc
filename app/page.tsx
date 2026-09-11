import { redirect } from "next/navigation";
import { TournamentCardGrid } from "@/components/tournament-card-grid";
import { getPublicSeasons, mapPublicTournamentCards } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const { seasonId } = await searchParams;
  if (seasonId) redirect(`/seasons/${seasonId}`);

  const tournaments = mapPublicTournamentCards(await getPublicSeasons());

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Choose a tournament to view standings, upcoming matches, and the full schedule.
        </p>
      </div>
      <TournamentCardGrid tournaments={tournaments} />
    </div>
  );
}
