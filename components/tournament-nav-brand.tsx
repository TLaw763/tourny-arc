import Link from "next/link";
import { GamePlatformLogo } from "@/components/game-platform-badge";
import type { PublicTournamentCard } from "@/lib/queries";
import { tournamentInitials } from "@/lib/tournament-display";

export function TournamentNavBrand({ tournament }: { tournament: PublicTournamentCard }) {
  const initials = tournamentInitials(tournament.competitionName);

  return (
    <Link
      href={`/seasons/${tournament.seasonId}`}
      className="site-header-tournament-brand no-underline"
    >
      <span className="site-header-tournament-logo" aria-hidden>
        {tournament.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tournament.logoUrl} alt="" className="site-header-tournament-logo-img" />
        ) : tournament.gamePlatform ? (
          <GamePlatformLogo
            platform={tournament.gamePlatform}
            className="site-header-tournament-logo-img site-header-tournament-logo-img--platform"
          />
        ) : (
          <span className="site-header-tournament-logo-fallback">{initials}</span>
        )}
      </span>
      <span className="site-header-tournament-text">
        <span className="site-header-tournament-name">{tournament.competitionName}</span>
        {tournament.seasonName !== tournament.competitionName && (
          <span className="site-header-tournament-season">{tournament.seasonName}</span>
        )}
      </span>
    </Link>
  );
}
