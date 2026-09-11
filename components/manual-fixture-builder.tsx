"use client";

import { useState } from "react";
import type { ManualPairingInput } from "@/lib/domain/pairing";

export function ManualFixtureBuilder({
  participants,
  onChange,
}: {
  participants: Array<{ id: string; display_name: string }>;
  onChange: (pairings: ManualPairingInput[]) => void;
}) {
  const [roundSequence, setRoundSequence] = useState(1);
  const [participantAId, setParticipantAId] = useState("");
  const [participantBId, setParticipantBId] = useState("");
  const [pairings, setPairings] = useState<ManualPairingInput[]>([]);

  function addPairing() {
    if (!participantAId || !participantBId || participantAId === participantBId) return;
    const next = [
      ...pairings,
      { roundSequence, participantAId, participantBId },
    ];
    setPairings(next);
    onChange(next);
    setParticipantAId("");
    setParticipantBId("");
  }

  return (
    <div className="panel-subtle space-y-3 p-4">
      <h3 className="font-semibold">Manual pairings</h3>
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          type="number"
          min={1}
          className="field-input"
          value={roundSequence}
          onChange={(e) => setRoundSequence(Number(e.target.value))}
          placeholder="Round"
        />
        <select className="field-select" value={participantAId} onChange={(e) => setParticipantAId(e.target.value)}>
          <option value="">Player A</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <select className="field-select" value={participantBId} onChange={(e) => setParticipantBId(e.target.value)}>
          <option value="">Player B</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <button type="button" className="btn-secondary" onClick={addPairing}>
          Add pairing
        </button>
      </div>
      {pairings.length > 0 && (
        <ul className="text-sm">
          {pairings.map((p, i) => (
            <li key={i}>
              Round {p.roundSequence}:{" "}
              {participants.find((x) => x.id === p.participantAId)?.display_name} vs{" "}
              {participants.find((x) => x.id === p.participantBId)?.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
