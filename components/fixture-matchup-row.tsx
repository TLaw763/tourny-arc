import Link from "next/link";
import { buildFixtureMatchDisplay } from "@/lib/fixture-match-display";
import type { PublicScheduleFixture } from "@/lib/queries";

function PlayerSide({
  participantId,
  seasonId,
  name,
  username,
  align,
  isWinner,
  isLoser,
  wonLabel,
}: {
  participantId: string;
  seasonId: string;
  name: string;
  username: string | null;
  align: "left" | "right";
  isWinner: boolean;
  isLoser: boolean;
  wonLabel: string | null;
}) {
  const className = [
    "fixture-matchup-player",
    align === "right" ? "fixture-matchup-player--right" : "",
    isWinner ? "fixture-matchup-player--winner" : "",
    isLoser ? "fixture-matchup-player--loser" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={`/players/${participantId}?seasonId=${seasonId}`}
      className={className}
    >
      <div className={`fixture-matchup-player-head ${align === "right" ? "fixture-matchup-player-head--right" : ""}`}>
        <span className="fixture-matchup-player-name">{name}</span>
        {wonLabel && <span className="fixture-matchup-won">{wonLabel}</span>}
      </div>
      {username && <span className="fixture-matchup-username">{username}</span>}
    </Link>
  );
}

export function FixtureMatchupRow({
  fixture,
  seasonId,
}: {
  fixture: PublicScheduleFixture;
  seasonId: string;
}) {
  const display = buildFixtureMatchDisplay(fixture.state, fixture.match_outcome, fixture.match_games);
  const aWinner = display.winnerSide === "a";
  const bWinner = display.winnerSide === "b";
  const aLoser = display.isPlayed && bWinner;
  const bLoser = display.isPlayed && aWinner;

  return (
    <div className="fixture-matchup">
      <PlayerSide
        participantId={fixture.participant_a_id}
        seasonId={seasonId}
        name={fixture.participant_a_name}
        username={fixture.participant_a_username}
        align="left"
        isWinner={aWinner}
        isLoser={aLoser}
        wonLabel={aWinner ? display.wonLabel : null}
      />
      <Link href={`/fixtures/${fixture.id}`} className="fixture-matchup-score" aria-label="View fixture">
        {display.centerScore}
      </Link>
      <PlayerSide
        participantId={fixture.participant_b_id}
        seasonId={seasonId}
        name={fixture.participant_b_name}
        username={fixture.participant_b_username}
        align="right"
        isWinner={bWinner}
        isLoser={bLoser}
        wonLabel={bWinner ? display.wonLabel : null}
      />
    </div>
  );
}
