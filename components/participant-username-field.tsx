"use client";

import { useState } from "react";

export function ParticipantUsernameField({
  participantId,
  displayName,
  username,
  linkedAccountId,
  onSave,
  onApplyFromProfile,
  className,
}: {
  participantId: string;
  displayName: string;
  username: string | null;
  linkedAccountId: string | null;
  onSave: (participantId: string, username: string) => Promise<void>;
  onApplyFromProfile?: (participantId: string) => Promise<void>;
  className?: string;
}) {
  const [value, setValue] = useState(username ?? "");
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

  async function handleApplyFromProfile() {
    if (!onApplyFromProfile) return;
    setLoading(true);
    setMessage(null);
    try {
      await onApplyFromProfile(participantId);
      setMessage("Applied from profile");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No profile username");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2 text-sm"}>
      <span className="roster-player-row-name min-w-[6rem] font-medium">{displayName}</span>
      <input
        className="field-input roster-player-row-username"
        placeholder="Username (optional)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="button" className="btn-secondary text-xs" disabled={loading} onClick={handleSave}>
        Save
      </button>
      {linkedAccountId && onApplyFromProfile && (
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={loading}
          onClick={handleApplyFromProfile}
        >
          Use profile username
        </button>
      )}
      {message && <span className="text-xs text-[var(--color-text-muted)]">{message}</span>}
    </div>
  );
}
