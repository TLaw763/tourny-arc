import type { PublicTournamentCard } from "@/lib/queries";
import { formatSeasonDateRange, tournamentInitials } from "@/lib/tournament-display";

export function TournamentHero({ tournament }: { tournament: PublicTournamentCard }) {
  const dateRange = formatSeasonDateRange(tournament.startsAt, tournament.endsAt);
  const initials = tournamentInitials(tournament.competitionName);

  return (
    <section className="tournament-hero">
      <div className="tournament-hero-fullbleed">
        <div className="tournament-hero-cover">
          {tournament.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tournament.coverImageUrl} alt="" className="tournament-hero-cover-img" />
          ) : (
            <div className="tournament-hero-cover-fallback" aria-hidden>
              {initials}
            </div>
          )}
        </div>
      </div>
      <div className="tournament-hero-body">
        <div className="tournament-hero-logo-wrap">
          {tournament.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tournament.logoUrl} alt="" className="tournament-hero-logo-img" />
          ) : (
            <div className="tournament-hero-logo-fallback" aria-hidden>
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold">{tournament.competitionName}</h1>
          <p className="text-[var(--color-text-muted)]">{tournament.seasonName}</p>
          {dateRange && <p className="text-sm text-[var(--color-text-muted)]">{dateRange}</p>}
          {tournament.description && (
            <p className="pt-2 text-sm">{tournament.description}</p>
          )}
        </div>
      </div>
    </section>
  );
}
