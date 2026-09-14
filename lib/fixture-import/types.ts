import type { PairingRound } from "@/lib/domain/pairing";

export type FixtureImportMeta = {
  roundSequence: number;
  participantAId: string;
  participantBId: string;
  scoreA: number | null;
  scoreB: number | null;
  scheduledAt: string | null;
  decidedAt: string | null;
};

export type FixtureImportPreview = {
  rounds: PairingRound[];
  fixtureMeta: FixtureImportMeta[];
  warnings: string[];
  blockingErrors: string[];
  unmappedPlayers: string[];
  sourceFixtureCount: number;
  scoredFixtureCount: number;
};

/** @deprecated Use FixtureImportMeta */
export type MdLeagueImportFixtureMeta = FixtureImportMeta;

/** @deprecated Use FixtureImportPreview */
export type MdLeagueImportPreview = FixtureImportPreview;
