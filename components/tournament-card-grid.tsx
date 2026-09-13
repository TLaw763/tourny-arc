import Link from "next/link";
import { GamePlatformLabel, GamePlatformLogo } from "@/components/game-platform-badge";
import type { PublicTournamentCard } from "@/lib/queries";
import { formatSeasonDateRange, tournamentInitials } from "@/lib/tournament-display";

export function TournamentCardGrid({ tournaments }: { tournaments: PublicTournamentCard[] }) {
  if (tournaments.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)]">
        No public tournaments yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="tournament-card-grid">
      {tournaments.map((tournament) => (
        <TournamentCard key={tournament.seasonId} tournament={tournament} />
      ))}
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: PublicTournamentCard }) {
  const dateRange = formatSeasonDateRange(tournament.startsAt, tournament.endsAt);
  const initials = tournamentInitials(tournament.competitionName);

  return (
    <Link href={`/seasons/${tournament.seasonId}`} className="tournament-card panel no-underline">
      <div className="tournament-card-cover">
        {tournament.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.coverImageUrl}
            alt=""
            className="tournament-card-cover-img"
          />
        ) : (
          <div className="tournament-card-cover-fallback" aria-hidden>
            {initials}
          </div>
        )}
        <div className="tournament-card-logo-wrap">
          {tournament.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tournament.logoUrl}
              alt=""
              className="tournament-card-logo-img"
            />
          ) : tournament.gamePlatform ? (
            <GamePlatformLogo
              platform={tournament.gamePlatform}
              className="tournament-card-logo-img tournament-card-logo-img--platform"
            />
          ) : (
            <div className="tournament-card-logo-fallback" aria-hidden>
              {initials}
            </div>
          )}
        </div>
      </div>
      <div className="tournament-card-body">
        <h2 className="tournament-card-title">{tournament.competitionName}</h2>
        <p className="tournament-card-season">{tournament.seasonName}</p>
        {tournament.gamePlatform && (
          <GamePlatformLabel platform={tournament.gamePlatform} variant="card" />
        )}
        {dateRange && <p className="tournament-card-meta">{dateRange}</p>}
        {tournament.description && (
          <p className="tournament-card-description">{tournament.description}</p>
        )}
      </div>
    </Link>
  );
}
