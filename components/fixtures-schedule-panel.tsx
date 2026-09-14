"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FixtureMatchupRow } from "@/components/fixture-matchup-row";
import { groupFixturesByRound } from "@/lib/fixture-display";
import type { PublicScheduleFixture } from "@/lib/queries";

type RoundItem = { id: string; label: string; sequence: number };

type ResultFilter = "all" | "todo" | "played";

function uniquePlayers(fixtures: PublicScheduleFixture[]) {
  const map = new Map<string, string>();
  for (const fixture of fixtures) {
    if (fixture.participant_a_id) {
      map.set(fixture.participant_a_id, fixture.participant_a_name);
    }
    if (fixture.participant_b_id) {
      map.set(fixture.participant_b_id, fixture.participant_b_name);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function matchesFilter(fixture: PublicScheduleFixture, filter: ResultFilter) {
  if (filter === "played") return fixture.state === "finalized";
  if (filter === "todo") return fixture.state !== "finalized";
  return true;
}

export function FixturesSchedulePanel({
  seasonId,
  seasonLabel,
  listFixtures,
  rounds,
}: {
  seasonId: string;
  seasonLabel: string;
  listFixtures: PublicScheduleFixture[];
  rounds: RoundItem[];
}) {
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [playerId, setPlayerId] = useState("");
  const [openRoundIds, setOpenRoundIds] = useState<Set<string>>(() => {
    const first = rounds[0]?.id;
    return first ? new Set([first]) : new Set();
  });

  const players = useMemo(() => uniquePlayers(listFixtures), [listFixtures]);

  const filteredFixtures = useMemo(() => {
    return listFixtures.filter((fixture) => {
      if (!matchesFilter(fixture, resultFilter)) return false;
      if (!playerId) return true;
      return fixture.participant_a_id === playerId || fixture.participant_b_id === playerId;
    });
  }, [listFixtures, playerId, resultFilter]);

  const playedCount = listFixtures.filter((f) => f.state === "finalized").length;
  const totalCount = listFixtures.length;
  const playedPct = totalCount > 0 ? Math.round((playedCount / totalCount) * 100) : 0;

  const groups = useMemo(
    () => groupFixturesByRound(rounds, filteredFixtures),
    [filteredFixtures, rounds],
  );

  function toggleRound(roundId: string) {
    setOpenRoundIds((current) => {
      const next = new Set(current);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  }

  function expandAll() {
    setOpenRoundIds(new Set(groups.map(({ round }) => round.id)));
  }

  function collapseAll() {
    setOpenRoundIds(new Set());
  }

  return (
    <div className="fixtures-schedule space-y-6">
      <div className="space-y-2">
        <Link href="/" className="text-sm">
          ← All tournaments
        </Link>
        <div className="fixtures-schedule-header">
          <div>
            <h1 className="text-2xl font-bold">Fixtures</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{seasonLabel}</p>
            {totalCount > 0 && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {playedCount} of {totalCount} matches played · {playedPct}%
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href={`/calendar?seasonId=${seasonId}`} className="font-medium">
              Calendar
            </Link>
            <Link href={`/seasons/${seasonId}`} className="font-medium">
              Tournament home
            </Link>
          </div>
        </div>
      </div>

      {totalCount > 0 && (
        <div
          className="fixtures-progress-track"
          role="progressbar"
          aria-valuenow={playedPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="fixtures-progress-fill" style={{ width: `${playedPct}%` }} />
        </div>
      )}

      <div className="fixtures-schedule-toolbar">
        <select
          className="field-select fixtures-schedule-player-filter"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        >
          <option value="">All players</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>

        <div className="fixtures-filter-tabs" role="tablist" aria-label="Result filter">
          {(
            [
              ["all", "All"],
              ["todo", "To play"],
              ["played", "Played"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={resultFilter === value}
              className={
                resultFilter === value
                  ? "fixtures-filter-tab fixtures-filter-tab--active"
                  : "fixtures-filter-tab"
              }
              onClick={() => setResultFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {groups.length > 0 && (
          <div className="fixtures-round-actions">
            <button type="button" className="fixtures-round-action" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className="fixtures-round-action" onClick={collapseAll}>
              Collapse all
            </button>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No matchups match this filter.</p>
      ) : (
        <div className="fixtures-round-groups space-y-3">
          {groups.map(({ round, fixtures: roundFixtures }) => {
            const playedInRound = roundFixtures.filter((f) => f.state === "finalized").length;
            const roundTotal = roundFixtures.length;
            const roundPct = roundTotal > 0 ? (playedInRound / roundTotal) * 100 : 0;
            const isOpen = openRoundIds.has(round.id);
            const roundComplete = roundTotal > 0 && playedInRound === roundTotal;

            return (
              <section key={round.id} className="fixtures-round panel-subtle">
                <button
                  type="button"
                  className="fixtures-round-summary"
                  aria-expanded={isOpen}
                  onClick={() => toggleRound(round.id)}
                >
                  <span className="fixtures-round-index">{round.sequence}</span>
                  <div className="fixtures-round-meta">
                    <div className="fixtures-round-title-row">
                      <span className="fixtures-round-title">{round.label}</span>
                      <span
                        className={
                          roundComplete
                            ? "fixtures-round-chip fixtures-round-chip--complete"
                            : "fixtures-round-chip"
                        }
                      >
                        {playedInRound}/{roundTotal}
                      </span>
                    </div>
                    <div className="fixtures-round-progress-track">
                      <div
                        className={
                          roundComplete
                            ? "fixtures-round-progress-fill fixtures-round-progress-fill--complete"
                            : "fixtures-round-progress-fill"
                        }
                        style={{ width: `${roundPct}%` }}
                      />
                    </div>
                  </div>
                  <span className="fixtures-round-toggle">{isOpen ? "Hide" : "Show"}</span>
                </button>

                {isOpen && (
                  <div className="fixtures-round-body">
                    {roundFixtures.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Matchups for this round have not been generated yet.
                      </p>
                    ) : (
                      <div className="fixtures-round-matchups">
                        {roundFixtures.map((fixture) => (
                          <FixtureMatchupRow key={fixture.id} fixture={fixture} seasonId={seasonId} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
