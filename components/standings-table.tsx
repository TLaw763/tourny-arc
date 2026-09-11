import Link from "next/link";
import { FormBadges } from "@/components/form-badges";
import type { EnrichedStandingRow } from "@/lib/standings-display";

export function StandingsTable({
  rows,
  seasonId,
}: {
  rows: EnrichedStandingRow[];
  seasonId: string;
}) {
  if (!rows.length) {
    return (
      <p className="text-[var(--color-text-muted)]">
        No standings yet — finalize fixtures to rebuild.
      </p>
    );
  }

  return (
    <div className="standings-table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="standings-table-pos" scope="col">
              Pos
            </th>
            <th className="standings-table-player" scope="col">
              Player
            </th>
            <th scope="col">P</th>
            <th scope="col">W</th>
            <th scope="col">D</th>
            <th scope="col">L</th>
            <th scope="col">GW</th>
            <th scope="col">GL</th>
            <th scope="col">GD</th>
            <th className="standings-table-pts" scope="col">
              Pts
            </th>
            <th className="standings-table-form" scope="col">
              Form
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.participant_id} className="standings-table-row">
              <td className="standings-table-pos">{row.rank}</td>
              <td className="standings-table-player">
                <Link
                  href={`/players/${row.participant_id}?seasonId=${seasonId}`}
                  className="standings-table-player-link"
                >
                  {row.participants?.display_name ?? row.participant_id}
                </Link>
              </td>
              <td>{row.matches_played}</td>
              <td>{row.matches_won}</td>
              <td>{row.matches_drawn}</td>
              <td>{row.matches_lost}</td>
              <td>{row.games_won}</td>
              <td>{row.games_lost}</td>
              <td
                className={
                  row.game_difference > 0
                    ? "standings-table-gd standings-table-gd--pos"
                    : row.game_difference < 0
                      ? "standings-table-gd standings-table-gd--neg"
                      : "standings-table-gd"
                }
              >
                {row.game_difference > 0 ? `+${row.game_difference}` : row.game_difference}
              </td>
              <td className="standings-table-pts">{row.match_points}</td>
              <td className="standings-table-form">
                <FormBadges
                  form={row.form}
                  matchesPlayed={row.matches_played}
                  seasonTotalMatches={row.seasonTotalMatches}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
