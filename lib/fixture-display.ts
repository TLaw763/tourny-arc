export function getFixtureWinnerName(
  outcome: string | null | undefined,
  participantAName: string,
  participantBName: string,
): string | null {
  if (outcome === "playerAWin" || outcome === "forfeitB") return participantAName;
  if (outcome === "playerBWin" || outcome === "forfeitA") return participantBName;
  return null;
}

export type FixtureStatusVariant =
  | "scheduled"
  | "not-scheduled"
  | "winner"
  | "draw"
  | "cancelled";

export function getFixtureStatus(
  state: string,
  confirmedStartAt: string | null | undefined,
  matchOutcome: string | null | undefined,
  participantAName?: string,
  participantBName?: string,
): { label: string; variant: FixtureStatusVariant } | null {
  if (state === "cancelled") {
    return { label: "Cancelled", variant: "cancelled" };
  }
  if (state === "postponed") {
    return { label: "Postponed", variant: "cancelled" };
  }
  if (state === "finalized") {
    if (matchOutcome === "draw") {
      return { label: "Draw", variant: "draw" };
    }
    const winner = getFixtureWinnerName(
      matchOutcome,
      participantAName ?? "Player A",
      participantBName ?? "Player B",
    );
    if (winner) {
      return { label: `${winner} won`, variant: "winner" };
    }
    return { label: "Finalized", variant: "winner" };
  }
  if (confirmedStartAt) {
    return { label: "Scheduled", variant: "scheduled" };
  }
  return { label: "Not scheduled", variant: "not-scheduled" };
}

/** Format for `<input type="datetime-local" />`. */
export function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string) {
  return new Date(value).toISOString();
}

export function defaultScheduleDatetime(existing?: string | null) {
  if (existing) return toDatetimeLocalValue(new Date(existing));
  const next = new Date(Date.now() + 86400000);
  next.setMinutes(0, 0, 0);
  return toDatetimeLocalValue(next);
}

export type RoundLike = { id: string; label: string; sequence: number };
export type FixtureWithRound = { id: string; round_id?: string | null; is_bye?: boolean };

export function groupFixturesByRound<R extends RoundLike, F extends FixtureWithRound>(
  rounds: R[],
  fixtures: F[],
) {
  const sortedRounds = [...rounds].sort((a, b) => a.sequence - b.sequence);
  const grouped = new Map<string, F[]>(sortedRounds.map((round) => [round.id, []]));
  const unassigned: F[] = [];

  for (const fixture of fixtures.filter((f) => !f.is_bye)) {
    if (fixture.round_id && grouped.has(fixture.round_id)) {
      grouped.get(fixture.round_id)!.push(fixture);
    } else {
      unassigned.push(fixture);
    }
  }

  const result = sortedRounds.map((round) => ({
    round,
    fixtures: grouped.get(round.id) ?? [],
  }));

  if (unassigned.length > 0) {
    result.push({
      round: {
        id: "__unassigned__",
        label: "Unassigned",
        sequence: Number.MAX_SAFE_INTEGER,
      } as R,
      fixtures: unassigned,
    });
  }

  return result;
}
