"use client";

import {
  assignParticipantInSchedule,
  participantIdsInRound,
  type PairingRound,
} from "@/lib/domain/pairing";

type Participant = { id: string; display_name: string };

type GenerationPreviewEditorProps = {
  rounds: PairingRound[];
  participants: Participant[];
  onChange: (rounds: PairingRound[]) => void;
};

function participantName(participants: Participant[], id: string) {
  return participants.find((p) => p.id === id)?.display_name ?? id;
}

function swapFixtureSides(
  rounds: PairingRound[],
  roundIndex: number,
  fixtureIndex: number,
): PairingRound[] {
  return rounds.map((round, ri) => {
    if (ri !== roundIndex) return round;
    return {
      ...round,
      fixtures: round.fixtures.map((fixture, fi) => {
        if (fi !== fixtureIndex || fixture.isBye) return fixture;
        return {
          ...fixture,
          participantAId: fixture.participantBId,
          participantBId: fixture.participantAId,
        };
      }),
    };
  });
}

export function GenerationPreviewEditor({
  rounds,
  participants,
  onChange,
}: GenerationPreviewEditorProps) {
  const matchupTotal = rounds.reduce(
    (sum, round) => sum + round.fixtures.filter((f) => !f.isBye).length,
    0,
  );

  return (
    <div className="panel-subtle space-y-4 p-4">
      <div className="space-y-1">
        <h3 className="font-semibold">Schedule preview</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {rounds.length} round{rounds.length === 1 ? "" : "s"} · {matchupTotal} matchup
          {matchupTotal === 1 ? "" : "s"}. Each player appears once per round — picking
          someone already in that round swaps their matchups.
        </p>
      </div>

      <div className="space-y-3">
        {rounds.map((round, roundIndex) => (
          <details
            key={round.sequence}
            className="round-collapsible"
            open={roundIndex < 2}
          >
            <summary className="round-collapsible-summary cursor-pointer">
              <span className="font-medium">{round.label}</span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {round.fixtures.filter((f) => !f.isBye).length} matchup
                {round.fixtures.filter((f) => !f.isBye).length === 1 ? "" : "s"}
              </span>
            </summary>
            <ul className="mt-3 space-y-2">
              {(() => {
                const roundParticipantIds = new Set(participantIdsInRound(round));
                const roundParticipants = participants.filter((p) =>
                  roundParticipantIds.has(p.id),
                );
                return round.fixtures.map((fixture, fixtureIndex) => {
                if (fixture.isBye) {
                  return (
                    <li
                      key={`${round.sequence}-bye-${fixtureIndex}`}
                      className="text-sm text-[var(--color-text-muted)]"
                    >
                      Bye: {participantName(participants, fixture.participantAId)}
                    </li>
                  );
                }

                return (
                  <li
                    key={`${round.sequence}-${fixtureIndex}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <select
                      className="field-select min-w-[8rem] flex-1"
                      value={fixture.participantAId}
                      onChange={(e) =>
                        onChange(
                          assignParticipantInSchedule(
                            rounds,
                            roundIndex,
                            fixtureIndex,
                            "A",
                            e.target.value,
                          ),
                        )
                      }
                    >
                      {roundParticipants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-[var(--color-text-muted)]">vs</span>
                    <select
                      className="field-select min-w-[8rem] flex-1"
                      value={fixture.participantBId}
                      onChange={(e) =>
                        onChange(
                          assignParticipantInSchedule(
                            rounds,
                            roundIndex,
                            fixtureIndex,
                            "B",
                            e.target.value,
                          ),
                        )
                      }
                    >
                      {roundParticipants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      title="Swap home and away"
                      onClick={() =>
                        onChange(swapFixtureSides(rounds, roundIndex, fixtureIndex))
                      }
                    >
                      Swap
                    </button>
                  </li>
                );
              });
              })()}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
