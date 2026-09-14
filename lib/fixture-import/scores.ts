import { gamesFromMatchScore, type ScoringGame } from "@/lib/domain/scoring";
import type { FixtureImportMeta } from "@/lib/fixture-import/types";

export function importScoreToGames(scoreA: number, scoreB: number): ScoringGame[] | null {
  if (scoreA === 2 && scoreB === 0) return gamesFromMatchScore("2-0");
  if (scoreA === 2 && scoreB === 1) return gamesFromMatchScore("2-1");
  if (scoreA === 0 && scoreB === 2) return gamesFromMatchScore("0-2");
  if (scoreA === 1 && scoreB === 2) return gamesFromMatchScore("1-2");
  if (scoreA === scoreB) return gamesFromMatchScore("draw");
  return null;
}

export function findFixtureMeta(
  meta: FixtureImportMeta[],
  roundSequence: number,
  participantAId: string,
  participantBId: string,
): FixtureImportMeta | undefined {
  return meta.find(
    (entry) =>
      entry.roundSequence === roundSequence &&
      ((entry.participantAId === participantAId && entry.participantBId === participantBId) ||
        (entry.participantAId === participantBId && entry.participantBId === participantAId)),
  );
}

export function importScoreToGamesForFixture(
  meta: FixtureImportMeta,
  participantAId: string,
  participantBId: string,
): ScoringGame[] | null {
  if (meta.scoreA === null || meta.scoreB === null) return null;
  const aligned = meta.participantAId === participantAId && meta.participantBId === participantBId;
  const scoreA = aligned ? meta.scoreA : meta.scoreB;
  const scoreB = aligned ? meta.scoreB : meta.scoreA;
  return importScoreToGames(scoreA, scoreB);
}

export function fixtureHasImportableScore(
  meta: FixtureImportMeta | undefined,
  participantAId: string,
  participantBId: string,
): boolean {
  if (!meta || meta.scoreA === null || meta.scoreB === null) return false;
  return !!importScoreToGamesForFixture(meta, participantAId, participantBId);
}
