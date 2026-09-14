import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlayerProfileCards } from "@/components/player-profile-cards";
import { getPublicPlayerProfile } from "@/lib/queries";
import { requireSelectedSeasonId } from "@/lib/selected-season";
import { tournamentInitials } from "@/lib/tournament-display";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ participantId: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const { participantId } = await params;
  const { seasonId: seasonIdParam } = await searchParams;
  const seasonId = await requireSelectedSeasonId(seasonIdParam);

  if (!seasonIdParam || seasonIdParam !== seasonId) {
    redirect(`/players/${participantId}?seasonId=${seasonId}`);
  }

  const profile = await getPublicPlayerProfile(seasonId, participantId);
  if (!profile) notFound();

  const { participant, tournament, standing, neighborAbove, neighborBelow, form, seasonTotalMatches, upcoming } =
    profile;
  const initials = tournamentInitials(participant.display_name);

  return (
    <div className="player-profile space-y-6">
      <Link href={`/standings?seasonId=${seasonId}`} className="text-sm">
        ← Standings
      </Link>

      <header className="player-profile-header">
        <div className="player-profile-avatar" aria-hidden>
          {initials}
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{participant.display_name}</h1>
          {tournament && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {tournament.competitionName} — {tournament.seasonName}
            </p>
          )}
          {participant.online_client_username && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {participant.online_client_username}
            </p>
          )}
        </div>
      </header>

      <PlayerProfileCards
        seasonId={seasonId}
        playerName={participant.display_name}
        standing={standing}
        neighborAbove={neighborAbove}
        neighborBelow={neighborBelow}
        form={form}
        seasonTotalMatches={seasonTotalMatches}
        upcoming={upcoming.filter(
          (f): f is typeof f & { confirmed_start_at: string } => !!f.confirmed_start_at,
        )}
      />
    </div>
  );
}
