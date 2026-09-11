export type PairingFixture = {
  participantAId: string;
  participantBId: string;
  isBye: boolean;
};

export type PairingRound = {
  sequence: number;
  label: string;
  fixtures: PairingFixture[];
};

export type ManualPairingInput = {
  roundSequence: number;
  participantAId: string;
  participantBId: string;
};

export type PairingValidationIssue = {
  code: string;
  message: string;
};

export type PairingValidationResult = {
  blockingErrors: PairingValidationIssue[];
  warnings: PairingValidationIssue[];
};

const BYE_SENTINEL = "__BYE__";

/** Deterministic single round-robin using the circle method. */
export function generateSingleRoundRobin(participantIds: string[]): PairingRound[] {
  const ids = [...participantIds].sort();
  if (ids.length < 2) return [];

  const hasBye = ids.length % 2 === 1;
  const players = hasBye ? [...ids, BYE_SENTINEL] : ids;
  const count = players.length;
  const roundCount = count - 1;
  const rounds: PairingRound[] = [];
  let rotated = [...players];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
    const fixtures: PairingFixture[] = [];
    for (let i = 0; i < count / 2; i++) {
      const left = rotated[i]!;
      const right = rotated[count - 1 - i]!;
      if (left === BYE_SENTINEL || right === BYE_SENTINEL) {
        const byePlayer = left === BYE_SENTINEL ? right : left;
        fixtures.push({
          participantAId: byePlayer,
          participantBId: byePlayer,
          isBye: true,
        });
      } else {
        fixtures.push({
          participantAId: left,
          participantBId: right,
          isBye: false,
        });
      }
    }
    rounds.push({
      sequence: roundIndex + 1,
      label: `Round ${roundIndex + 1}`,
      fixtures,
    });
    const fixed = rotated[0]!;
    const rest = rotated.slice(1);
    const last = rest.pop()!;
    rotated = [fixed, last, ...rest];
  }

  return rounds;
}

/** Deterministic double round-robin (home and away). */
export function generateDoubleRoundRobin(participantIds: string[]): PairingRound[] {
  const single = generateSingleRoundRobin(participantIds);
  const firstLegCount = single.length;
  const secondLeg = single.map((round, index) => ({
    sequence: firstLegCount + index + 1,
    label: `Round ${firstLegCount + index + 1} (return)`,
    fixtures: round.fixtures.map((fixture) =>
      fixture.isBye
        ? fixture
        : {
            participantAId: fixture.participantBId,
            participantBId: fixture.participantAId,
            isBye: false,
          },
    ),
  }));
  return [...single, ...secondLeg];
}

function pairingKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Validate manual pairings for duplicates, self-pairings, and ineligible participants. */
export function validateManualPairings(
  pairings: ManualPairingInput[],
  eligibleParticipantIds: string[],
  committedPairings: ManualPairingInput[] = [],
): PairingValidationResult {
  const blockingErrors: PairingValidationIssue[] = [];
  const warnings: PairingValidationIssue[] = [];
  const eligible = new Set(eligibleParticipantIds);
  const seenInRound = new Map<number, Set<string>>();
  const seenGlobally = new Set<string>();

  for (const committed of committedPairings) {
    if (committed.participantAId !== committed.participantBId) {
      seenGlobally.add(pairingKey(committed.participantAId, committed.participantBId));
    }
  }

  for (const pairing of pairings) {
    const { roundSequence, participantAId, participantBId } = pairing;

    if (participantAId === participantBId) {
      blockingErrors.push({
        code: "SELF_PAIRING",
        message: `Round ${roundSequence}: participant cannot be paired with themselves`,
      });
      continue;
    }

    if (!eligible.has(participantAId) || !eligible.has(participantBId)) {
      blockingErrors.push({
        code: "INELIGIBLE_PARTICIPANT",
        message: `Round ${roundSequence}: one or both participants are ineligible`,
      });
      continue;
    }

    const key = pairingKey(participantAId, participantBId);
    const roundSet = seenInRound.get(roundSequence) ?? new Set<string>();
    if (roundSet.has(participantAId) || roundSet.has(participantBId)) {
      blockingErrors.push({
        code: "DUPLICATE_IN_ROUND",
        message: `Round ${roundSequence}: participant appears more than once`,
      });
    }
    roundSet.add(participantAId);
    roundSet.add(participantBId);
    seenInRound.set(roundSequence, roundSet);

    if (seenGlobally.has(key)) {
      blockingErrors.push({
        code: "DUPLICATE_PAIRING",
        message: `Round ${roundSequence}: pairing already committed`,
      });
    }
  }

  if (pairings.length === 0) {
    blockingErrors.push({
      code: "EMPTY_PAIRINGS",
      message: "Manual mode requires at least one pairing",
    });
  }

  return { blockingErrors, warnings };
}

/** Group manual pairings into rounds for preview output. */
export function manualPairingsToRounds(pairings: ManualPairingInput[]): PairingRound[] {
  const byRound = new Map<number, PairingFixture[]>();
  for (const pairing of pairings) {
    const fixtures = byRound.get(pairing.roundSequence) ?? [];
    fixtures.push({
      participantAId: pairing.participantAId,
      participantBId: pairing.participantBId,
      isBye: false,
    });
    byRound.set(pairing.roundSequence, fixtures);
  }
  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([sequence, fixtures]) => ({
      sequence,
      label: `Round ${sequence}`,
      fixtures,
    }));
}
