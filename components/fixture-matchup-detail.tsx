"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FixtureMatchupPlayerPanel } from "@/components/fixture-matchup-player-panel";
import { FixtureStateBadge } from "@/components/fixture-state-badge";
import { refreshPublicFixtureMatchupAction } from "@/lib/actions/public-fixture";
import { buildFixtureMatchDisplay } from "@/lib/fixture-match-display";
import type { PublicFixtureMatchup } from "@/lib/queries";

export function FixtureMatchupDetail({ initial }: { initial: PublicFixtureMatchup }) {
  const [data, setData] = useState(initial);

  const refresh = useCallback(async () => {
    const next = await refreshPublicFixtureMatchupAction(initial.fixture.id);
    if (next) setData(next);
  }, [initial.fixture.id]);

  useEffect(() => {
    if (data.fixture.state === "finalized") return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [data.fixture.state, refresh]);

  useEffect(() => {
    function onFocus() {
      void refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const games = data.match?.games ?? [];
  const display = buildFixtureMatchDisplay(data.fixture.state, data.match?.outcome, games);
  const aWinner = display.winnerSide === "a";
  const bWinner = display.winnerSide === "b";

  return (
    <div className="fixture-matchup-detail space-y-6">
      <Link href={`/seasons/${data.fixture.season_id}/schedule`} className="text-sm">
        ← Fixtures
      </Link>

      <div className="panel fixture-matchup-detail-hero space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          {data.roundLabel && (
            <span className="text-sm text-[var(--color-text-muted)]">{data.roundLabel}</span>
          )}
          <FixtureStateBadge
            state={data.fixture.state}
            confirmedStartAt={data.fixture.confirmed_start_at}
            matchOutcome={data.match?.outcome}
            participantAName={data.playerA.participant.display_name}
            participantBName={data.playerB.participant.display_name}
          />
        </div>

        {data.fixture.confirmed_start_at && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {new Date(data.fixture.confirmed_start_at).toLocaleString()}
          </p>
        )}

        <div className="fixture-matchup-detail-scoreboard">
          <FixtureMatchupPlayerPanel
            seasonId={data.fixture.season_id}
            player={data.playerA}
            align="left"
            isWinner={aWinner}
          />
          <div className="fixture-matchup-detail-center" aria-label="Match score">
            <span className="fixture-matchup-detail-score">{display.centerScore}</span>
            {display.wonLabel && (
              <span className="fixture-matchup-detail-score-label">{display.wonLabel}</span>
            )}
          </div>
          <FixtureMatchupPlayerPanel
            seasonId={data.fixture.season_id}
            player={data.playerB}
            align="right"
            isWinner={bWinner}
          />
        </div>
      </div>

      {data.streams.length > 0 && (
        <div className="panel space-y-2 p-4">
          <h2 className="font-semibold">Streams</h2>
          <ul className="space-y-1">
            {data.streams.map((stream, index) => (
              <li key={index}>
                <a href={stream.url} target="_blank" rel="noopener noreferrer">
                  {stream.label ?? stream.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
