import { getFixtureStatus, type FixtureStatusVariant } from "@/lib/fixture-display";

export function FixtureStateBadge({
  state,
  confirmedStartAt,
  matchOutcome,
  participantAName,
  participantBName,
}: {
  state: string;
  confirmedStartAt?: string | null;
  matchOutcome?: string | null;
  participantAName?: string;
  participantBName?: string;
}) {
  const status = getFixtureStatus(
    state,
    confirmedStartAt,
    matchOutcome,
    participantAName,
    participantBName,
  );
  if (!status) return null;

  return (
    <span className={`fixture-state fixture-state--${status.variant}`}>{status.label}</span>
  );
}

export type { FixtureStatusVariant };
