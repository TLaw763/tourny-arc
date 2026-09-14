"use client";

import { useState } from "react";

export function ParticipantPlayerIdField({
  participantId,
  playerId,
  onSave,
  className,
}: {
  participantId: string;
  playerId: string | null;
  onSave: (participantId: string, playerId: string) => Promise<void>;
  className?: string;
}) {
  const [value, setValue] = useState(playerId ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    try {
      await onSave(participantId, value.trim());
      setMessage("Saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2 text-sm"}>
      <input
        className="field-input roster-player-row-player-id"
        placeholder="MD / Konami ID"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="button" className="btn-secondary text-xs" disabled={loading} onClick={handleSave}>
        Save
      </button>
      {message && <span className="text-xs text-[var(--color-text-muted)]">{message}</span>}
    </div>
  );
}
