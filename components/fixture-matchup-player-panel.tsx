import Link from "next/link";
import { FormBadges } from "@/components/form-badges";
import type { FixtureMatchupPlayerContext } from "@/lib/queries";

function playerLabel(participant: FixtureMatchupPlayerContext["participant"]) {
  const parts = [participant.display_name];
  if (participant.online_client_username) parts.push(participant.online_client_username);
  if (participant.online_client_player_id) parts.push(participant.online_client_player_id);
  return parts.join(" · ");
}

export function FixtureMatchupPlayerPanel({
  seasonId,
  player,
  align,
  isWinner,
}: {
  seasonId: string;
  player: FixtureMatchupPlayerContext;
  align: "left" | "right";
  isWinner: boolean;
}) {
  const { participant, standing, form, seasonTotalMatches } = player;
  const matchDiff = standing ? standing.matches_won - standing.matches_lost : 0;

  return (
    <section
      className={
        align === "right"
          ? "fixture-matchup-player-panel fixture-matchup-player-panel--right"
          : "fixture-matchup-player-panel fixture-matchup-player-panel--left"
      }
    >
      <div className="fixture-matchup-player-panel-head">
        <Link
          href={`/players/${participant.id}?seasonId=${seasonId}`}
          className={
            isWinner
              ? "fixture-matchup-player-panel-name fixture-matchup-player-panel-name--winner"
              : "fixture-matchup-player-panel-name"
          }
        >
          {playerLabel(participant)}
        </Link>
        {isWinner && <span className="fixture-matchup-won">Winner</span>}
      </div>

      {standing ? (
        <div className="fixture-matchup-player-panel-stats">
          <div className="fixture-matchup-player-panel-highlight">
            <span className="fixture-matchup-player-panel-rank">#{standing.rank}</span>
            <span>{standing.match_points} pts</span>
          </div>
          <p className="fixture-matchup-player-panel-record">
            {standing.matches_won}W · {standing.matches_drawn}D · {standing.matches_lost}L ·{" "}
            {standing.matches_played} played
          </p>
          <FormBadges
            form={form}
            matchesPlayed={standing.matches_played}
            seasonTotalMatches={seasonTotalMatches}
          />
          <dl className="fixture-matchup-player-panel-detail">
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
          <Link href={`/standings?seasonId=${seasonId}`} className="text-sm">
            Full table →
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">
          Not ranked yet — no finalized matches.
        </p>
      )}
    </section>
  );
}
