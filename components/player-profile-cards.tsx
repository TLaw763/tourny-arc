import Link from "next/link";
import { FormBadges } from "@/components/form-badges";
import { FixtureStateBadge } from "@/components/fixture-state-badge";
import type { EnrichedStandingRow, FormResult } from "@/lib/standings-display";

type UpcomingFixture = {
  id: string;
  state: string;
  confirmed_start_at: string | null;
  participant_a_name: string;
  participant_b_name: string;
  match_outcome?: string | null;
  round_label?: string | null;
};

function neighborRow(row: EnrichedStandingRow, seasonId: string, highlight = false) {
  return (
    <div
      className={highlight ? "player-neighbor player-neighbor--self" : "player-neighbor"}
    >
      <span className="player-neighbor-pos">{row.rank}</span>
      <Link href={`/players/${row.participant_id}?seasonId=${seasonId}`} className="player-neighbor-name">
        {row.participants?.display_name ?? row.participant_id}
      </Link>
      <span className="player-neighbor-pts">{row.match_points} pts</span>
    </div>
  );
}

export function PlayerProfileCards({
  seasonId,
  playerName,
  standing,
  neighborAbove,
  neighborBelow,
  form,
  seasonTotalMatches,
  upcoming,
}: {
  seasonId: string;
  playerName: string;
  standing: EnrichedStandingRow | null;
  neighborAbove: EnrichedStandingRow | null;
  neighborBelow: EnrichedStandingRow | null;
  form: FormResult[];
  seasonTotalMatches: number;
  upcoming: UpcomingFixture[];
}) {
  const matchDiff = standing ? standing.matches_won - standing.matches_lost : 0;

  return (
    <div className="player-profile-cards">
      <section className="player-profile-card panel">
        <h2 className="player-profile-card-title">Table position</h2>
        {standing ? (
          <div className="player-profile-card-body space-y-4">
            <div className="player-position-highlight">
              <span className="player-position-rank">{standing.rank}</span>
              <div>
                <p className="font-semibold">{playerName}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {standing.match_points} pts · {standing.matches_won}W {standing.matches_drawn}D{" "}
                  {standing.matches_lost}L
                </p>
              </div>
            </div>
            <div className="player-neighbors">
              {neighborAbove && neighborRow(neighborAbove, seasonId)}
              {neighborRow(standing, seasonId, true)}
              {neighborBelow && neighborRow(neighborBelow, seasonId)}
            </div>
            <Link href={`/standings?seasonId=${seasonId}`} className="text-sm">
              Full table →
            </Link>
          </div>
        ) : (
          <p className="player-profile-card-body text-sm text-[var(--color-text-muted)]">
            Not ranked yet — no finalized matches.
          </p>
        )}
      </section>

      <section className="player-profile-card panel">
        <h2 className="player-profile-card-title">Form</h2>
        <div className="player-profile-card-body space-y-3">
          {standing ? (
            <>
              <FormBadges
                form={form}
                matchesPlayed={standing.matches_played}
                seasonTotalMatches={seasonTotalMatches}
              />
              <dl className="player-form-stats">
                <div>
                  <dt>Matches won</dt>
                  <dd>{standing.matches_won}</dd>
                </div>
                <div>
                  <dt>Matches lost</dt>
                  <dd>{standing.matches_lost}</dd>
                </div>
                <div>
                  <dt>Match diff</dt>
                  <dd>{matchDiff > 0 ? `+${matchDiff}` : matchDiff}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No form data yet.</p>
          )}
        </div>
      </section>

      <section className="player-profile-card panel">
        <h2 className="player-profile-card-title">Next matches</h2>
        <div className="player-profile-card-body">
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No upcoming fixtures scheduled.</p>
          ) : (
            <ul className="player-upcoming-list">
              {upcoming.map((fixture) => {
                const start = fixture.confirmed_start_at
                  ? new Date(fixture.confirmed_start_at).toLocaleString()
                  : null;
                return (
                  <li key={fixture.id} className="player-upcoming-item">
                    <Link href={`/fixtures/${fixture.id}`} className="font-medium">
                      {fixture.participant_a_name} vs {fixture.participant_b_name}
                    </Link>
                    {start && (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {start}
                        {fixture.round_label ? ` · ${fixture.round_label}` : ""}
                      </p>
                    )}
                    <FixtureStateBadge
                      state={fixture.state}
                      confirmedStartAt={fixture.confirmed_start_at}
                      matchOutcome={fixture.match_outcome}
                      participantAName={fixture.participant_a_name}
                      participantBName={fixture.participant_b_name}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
