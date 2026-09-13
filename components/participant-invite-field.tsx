"use client";

import { useState } from "react";
import { GMAIL_ONLY_INVITE_MESSAGE, isGmailAddress } from "@/lib/gmail-email";

export function ParticipantInviteField({
  participantId,
  displayName,
  linkedAccountId,
  pendingInviteEmail,
  onInvite,
  className,
}: {
  participantId: string;
  displayName: string;
  linkedAccountId: string | null;
  pendingInviteEmail?: string | null;
  onInvite: (participantId: string, email: string, displayName: string) => Promise<string>;
  className?: string;
}) {
  const [email, setEmail] = useState(pendingInviteEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (linkedAccountId) {
    return (
      <span className="fixture-state fixture-state--scheduled text-xs">Account linked</span>
    );
  }

  async function handleInvite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!isGmailAddress(trimmed)) {
      setMessage(GMAIL_ONLY_INVITE_MESSAGE);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const acceptUrl = await onInvite(participantId, trimmed, displayName);
      setMessage(acceptUrl);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setLoading(false);
    }
  }

  const groupClass = className ?? "roster-player-row-invite-group";

  return (
    <>
      <div className={groupClass}>
        <input
          className="field-input roster-player-row-email"
          type="email"
          placeholder="Gmail address"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (message === GMAIL_ONLY_INVITE_MESSAGE) setMessage(null);
          }}
        />
        <button
          type="button"
          className="btn-secondary shrink-0 text-xs"
          disabled={loading || !email.trim()}
          onClick={handleInvite}
        >
          Send invite
        </button>
      </div>
      {message && (
        <span
          className={`roster-player-row-message max-w-full break-all text-xs ${
            message === GMAIL_ONLY_INVITE_MESSAGE
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          {message.startsWith("http") ? `Link: ${message}` : message}
        </span>
      )}
    </>
  );
}
