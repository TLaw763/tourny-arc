import { createHash } from "node:crypto";
import type { ScheduleGenerationMode } from "@/lib/domain/types";
import {
  generateDoubleRoundRobin,
  generateSingleRoundRobin,
  manualPairingsToRounds,
  validateManualPairings,
  type ManualPairingInput,
  type PairingRound,
} from "./pairing";

export type GenerationPreviewInput = {
  mode: ScheduleGenerationMode;
  participantIds: string[];
  manualPairings?: ManualPairingInput[];
  committedPairings?: ManualPairingInput[];
};

export type GenerationPreviewOutput = {
  rounds: PairingRound[];
  warnings: Array<{ code: string; message: string }>;
  blockingErrors: Array<{ code: string; message: string }>;
  previewToken: string;
};

/** Build a fixture generation preview with validation and a commit token. */
export function buildGenerationPreview(
  input: GenerationPreviewInput,
): GenerationPreviewOutput {
  const { mode, participantIds, manualPairings = [], committedPairings = [] } = input;
  const warnings: Array<{ code: string; message: string }> = [];
  const blockingErrors: Array<{ code: string; message: string }> = [];

  if (participantIds.length < 2) {
    blockingErrors.push({
      code: "INSUFFICIENT_PARTICIPANTS",
      message: "At least two eligible participants are required",
    });
    return {
      rounds: [],
      warnings,
      blockingErrors,
      previewToken: signPreview({ rounds: [], mode }),
    };
  }

  let rounds: PairingRound[] = [];

  switch (mode) {
    case "single_round_robin":
      rounds = generateSingleRoundRobin(participantIds);
      if (participantIds.length % 2 === 1) {
        warnings.push({
          code: "BYE_REQUIRED",
          message: "Odd participant count — byes will be assigned each round",
        });
      }
      break;
    case "double_round_robin":
      rounds = generateDoubleRoundRobin(participantIds);
      if (participantIds.length % 2 === 1) {
        warnings.push({
          code: "BYE_REQUIRED",
          message: "Odd participant count — byes will be assigned each round",
        });
      }
      break;
    case "manual": {
      const validation = validateManualPairings(
        manualPairings,
        participantIds,
        committedPairings,
      );
      blockingErrors.push(...validation.blockingErrors);
      warnings.push(...validation.warnings);
      rounds = manualPairingsToRounds(manualPairings);
      break;
    }
  }

  const previewToken = signPreview({ rounds, mode });

  return { rounds, warnings, blockingErrors, previewToken };
}

/** Verify a preview token matches the expected rounds payload. */
export function verifyPreviewToken(
  token: string,
  expected: { rounds: PairingRound[] | unknown[]; mode: ScheduleGenerationMode },
): boolean {
  return token === signPreview(expected);
}

/** Normalize rounds after JSONB storage (key reordering / snake_case). */
export function normalizePairingRounds(rounds: unknown[]): PairingRound[] {
  return rounds.map((raw) => {
    const r = raw as Record<string, unknown>;
    const fixtures = Array.isArray(r.fixtures) ? r.fixtures : [];
    return {
      sequence: Number(r.sequence),
      label: String(r.label ?? ""),
      fixtures: fixtures.map((item) => {
        const f = item as Record<string, unknown>;
        return {
          participantAId: String(f.participantAId ?? f.participant_a_id ?? ""),
          participantBId: String(f.participantBId ?? f.participant_b_id ?? ""),
          isBye: Boolean(f.isBye ?? f.is_bye),
        };
      }),
    };
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(",")}}`;
}

function signPreview(payload: {
  rounds: PairingRound[] | unknown[];
  mode: ScheduleGenerationMode;
}): string {
  const canonical = {
    mode: payload.mode,
    rounds: normalizePairingRounds(payload.rounds),
  };
  return createHash("sha256").update(stableStringify(canonical)).digest("hex");
}

/** Track idempotent generation commits. */
export type IdempotencyStore = Map<string, { committedAt: string; roundIds: string[] }>;

export function checkIdempotencyKey(
  store: IdempotencyStore,
  key: string,
): { status: "new" } | { status: "replay"; roundIds: string[] } {
  const existing = store.get(key);
  if (existing) {
    return { status: "replay", roundIds: existing.roundIds };
  }
  return { status: "new" };
}

export function recordIdempotencyKey(
  store: IdempotencyStore,
  key: string,
  roundIds: string[],
): void {
  store.set(key, { committedAt: new Date().toISOString(), roundIds });
}
