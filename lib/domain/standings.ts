import type { MatchOutcome, Standing } from "@/lib/domain/types";

export type FinalizedMatchFact = {
  participantAId: string;
  participantBId: string;
  outcome: MatchOutcome;
  pointsPlayerA: number;
  pointsPlayerB: number;
  gamesWonA: number;
  gamesWonB: number;
  gamesDrawn: number;
};

export const DEFAULT_TIEBREAKER_ORDER = [
  "matchPoints",
  "gameDifference",
  "gamesTotal",
  "displayName",
] as const;

export type StandingsRebuildInput = {
  seasonId: string;
  participantIds: string[];
  matches: FinalizedMatchFact[];
  tiebreakerOrder?: string[];
  participantNames?: Record<string, string>;
  rebuiltAt?: string;
};

type ParticipantStats = {
  participantId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  matchPoints: number;
  tiebreakerValues: Record<string, number>;
  headToHead: Map<string, number>;
};

function isWinForA(outcome: MatchOutcome): boolean {
  return outcome === "playerAWin" || outcome === "forfeitB";
}

function isWinForB(outcome: MatchOutcome): boolean {
  return outcome === "playerBWin" || outcome === "forfeitA";
}

function isDraw(outcome: MatchOutcome): boolean {
  return outcome === "draw";
}

function gameDifference(stats: ParticipantStats) {
  return stats.gamesWon - stats.gamesLost;
}

function gamesTotal(stats: ParticipantStats) {
  return stats.gamesWon + stats.gamesLost;
}

function compareParticipants(
  a: ParticipantStats,
  b: ParticipantStats,
  tiebreakerOrder: string[],
  participantNames: Record<string, string>,
): number {
  for (const key of tiebreakerOrder) {
    let diff = 0;
    switch (key) {
      case "matchPoints":
        diff = b.matchPoints - a.matchPoints;
        break;
      case "gameDifference":
        diff = gameDifference(b) - gameDifference(a);
        break;
      case "gamesTotal":
        diff = gamesTotal(a) - gamesTotal(b);
        break;
      case "displayName": {
        const aName = participantNames[a.participantId] ?? a.participantId;
        const bName = participantNames[b.participantId] ?? b.participantId;
        diff = aName.localeCompare(bName, undefined, { sensitivity: "base" });
        break;
      }
      case "matchesWon":
        diff = b.matchesWon - a.matchesWon;
        break;
      case "gamesWon":
        diff = b.gamesWon - a.gamesWon;
        break;
      case "gamesWinPct": {
        const aPct = a.gamesPlayed === 0 ? 0 : a.gamesWon / a.gamesPlayed;
        const bPct = b.gamesPlayed === 0 ? 0 : b.gamesWon / b.gamesPlayed;
        diff = bPct - aPct;
        break;
      }
      case "headToHead": {
        const aH2H = a.headToHead.get(b.participantId) ?? 0;
        const bH2H = b.headToHead.get(a.participantId) ?? 0;
        diff = bH2H - aH2H;
        break;
      }
      default:
        diff = (b.tiebreakerValues[key] ?? 0) - (a.tiebreakerValues[key] ?? 0);
    }
    if (diff !== 0) return diff;
  }
  return a.participantId.localeCompare(b.participantId);
}

/** Deterministic standings rebuild from finalized match facts (D-047). */
export function rebuildStandings(input: StandingsRebuildInput): Standing[] {
  const {
    seasonId,
    participantIds,
    matches,
    tiebreakerOrder = [...DEFAULT_TIEBREAKER_ORDER],
    participantNames = {},
    rebuiltAt = new Date().toISOString(),
  } = input;

  const stats = new Map<string, ParticipantStats>();
  for (const id of [...participantIds].sort()) {
    stats.set(id, {
      participantId: id,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesDrawn: 0,
      gamesLost: 0,
      matchPoints: 0,
      tiebreakerValues: { gamesWon: 0, gamesWinPct: 0 },
      headToHead: new Map(),
    });
  }

  for (const match of matches) {
    const a = stats.get(match.participantAId);
    const b = stats.get(match.participantBId);
    if (!a || !b) continue;

    a.matchesPlayed++;
    b.matchesPlayed++;
    a.matchPoints += match.pointsPlayerA;
    b.matchPoints += match.pointsPlayerB;

    const gamesInMatch = match.gamesWonA + match.gamesWonB + match.gamesDrawn;
    a.gamesPlayed += gamesInMatch;
    b.gamesPlayed += gamesInMatch;
    a.gamesWon += match.gamesWonA;
    b.gamesWon += match.gamesWonB;
    a.gamesDrawn += match.gamesDrawn;
    b.gamesDrawn += match.gamesDrawn;
    a.gamesLost += match.gamesWonB;
    b.gamesLost += match.gamesWonA;

    a.tiebreakerValues.gamesWon = a.gamesWon;
    b.tiebreakerValues.gamesWon = b.gamesWon;
    a.tiebreakerValues.gamesWinPct = a.gamesPlayed === 0 ? 0 : a.gamesWon / a.gamesPlayed;
    b.tiebreakerValues.gamesWinPct = b.gamesPlayed === 0 ? 0 : b.gamesWon / b.gamesPlayed;

    if (isWinForA(match.outcome)) {
      a.matchesWon++;
      b.matchesLost++;
      a.headToHead.set(
        match.participantBId,
        (a.headToHead.get(match.participantBId) ?? 0) + 3,
      );
    } else if (isWinForB(match.outcome)) {
      b.matchesWon++;
      a.matchesLost++;
      b.headToHead.set(
        match.participantAId,
        (b.headToHead.get(match.participantAId) ?? 0) + 3,
      );
    } else if (isDraw(match.outcome)) {
      a.matchesDrawn++;
      b.matchesDrawn++;
      a.headToHead.set(
        match.participantBId,
        (a.headToHead.get(match.participantBId) ?? 0) + 1,
      );
      b.headToHead.set(
        match.participantAId,
        (b.headToHead.get(match.participantAId) ?? 0) + 1,
      );
    }
  }

  const sorted = [...stats.values()].sort((a, b) =>
    compareParticipants(a, b, tiebreakerOrder, participantNames),
  );

  return sorted.map((row, index) => ({
    participantId: row.participantId,
    seasonId,
    rank: index + 1,
    matchesPlayed: row.matchesPlayed,
    matchesWon: row.matchesWon,
    matchesDrawn: row.matchesDrawn,
    matchesLost: row.matchesLost,
    gamesPlayed: row.gamesPlayed,
    gamesWon: row.gamesWon,
    gamesDrawn: row.gamesDrawn,
    gamesLost: row.gamesLost,
    matchPoints: row.matchPoints,
    tiebreakerValues: { ...row.tiebreakerValues },
    rebuiltAt,
  }));
}
