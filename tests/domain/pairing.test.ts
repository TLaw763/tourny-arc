import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateDoubleRoundRobin,
  generateSingleRoundRobin,
  manualPairingsToRounds,
  validateManualPairings,
} from "../../lib/domain/pairing";
import { buildGenerationPreview, verifyPreviewToken } from "../../lib/domain/generation";
import {
  computeMatchOutcome,
  gamesFromMatchScore,
  formatMatchScore,
} from "../../lib/domain/scoring";

describe("single round-robin", () => {
  it("generates n-1 rounds for even participants", () => {
    const rounds = generateSingleRoundRobin(["p1", "p2", "p3", "p4"]);
    assert.equal(rounds.length, 3);
    assert.equal(rounds[0]!.fixtures.length, 2);
  });

  it("generates n rounds with byes for odd participants", () => {
    const rounds = generateSingleRoundRobin(["p1", "p2", "p3"]);
    assert.equal(rounds.length, 3);
    const byeFixtures = rounds.flatMap((r) => r.fixtures.filter((f) => f.isBye));
    assert.equal(byeFixtures.length, 3);
    for (const bye of byeFixtures) {
      assert.equal(bye.participantAId, bye.participantBId);
    }
  });

  it("is deterministic", () => {
    const a = generateSingleRoundRobin(["z", "a", "m"]);
    const b = generateSingleRoundRobin(["m", "z", "a"]);
    assert.deepEqual(a, b);
  });

  it("covers each pairing exactly once for four players", () => {
    const rounds = generateSingleRoundRobin(["p1", "p2", "p3", "p4"]);
    const pairs = new Set<string>();
    for (const round of rounds) {
      for (const fixture of round.fixtures) {
        if (!fixture.isBye) {
          pairs.add([fixture.participantAId, fixture.participantBId].sort().join(":"));
        }
      }
    }
    assert.equal(pairs.size, 6);
  });
});

describe("double round-robin", () => {
  it("doubles single round-robin length", () => {
    const single = generateSingleRoundRobin(["p1", "p2", "p3", "p4"]);
    const double = generateDoubleRoundRobin(["p1", "p2", "p3", "p4"]);
    assert.equal(double.length, single.length * 2);
  });

  it("swaps home and away on return leg", () => {
    const rounds = generateDoubleRoundRobin(["p1", "p2"]);
    assert.equal(rounds.length, 2);
    assert.equal(rounds[0]!.fixtures[0]!.participantAId, "p1");
    assert.equal(rounds[1]!.fixtures[0]!.participantAId, "p2");
  });
});

describe("manual pairings", () => {
  it("rejects self-pairings", () => {
    const result = validateManualPairings(
      [{ roundSequence: 1, participantAId: "p1", participantBId: "p1" }],
      ["p1", "p2"],
    );
    assert.ok(result.blockingErrors.some((e) => e.code === "SELF_PAIRING"));
  });

  it("rejects ineligible participants", () => {
    const result = validateManualPairings(
      [{ roundSequence: 1, participantAId: "p1", participantBId: "p3" }],
      ["p1", "p2"],
    );
    assert.ok(result.blockingErrors.some((e) => e.code === "INELIGIBLE_PARTICIPANT"));
  });

  it("allows the same pairing in different manual rounds", () => {
    const result = validateManualPairings(
      [
        { roundSequence: 1, participantAId: "p1", participantBId: "p2" },
        { roundSequence: 2, participantAId: "p2", participantBId: "p1" },
      ],
      ["p1", "p2"],
    );
    assert.equal(result.blockingErrors.length, 0);
  });

  it("rejects duplicate pairings against committed fixtures", () => {
    const result = validateManualPairings(
      [
        { roundSequence: 1, participantAId: "p1", participantBId: "p2" },
        { roundSequence: 2, participantAId: "p2", participantBId: "p1" },
      ],
      ["p1", "p2"],
      [{ roundSequence: 0, participantAId: "p1", participantBId: "p2" }],
    );
    assert.ok(result.blockingErrors.some((e) => e.code === "DUPLICATE_PAIRING"));
  });

  it("groups into rounds", () => {
    const rounds = manualPairingsToRounds([
      { roundSequence: 2, participantAId: "p1", participantBId: "p2" },
      { roundSequence: 1, participantAId: "p3", participantBId: "p4" },
    ]);
    assert.equal(rounds[0]!.sequence, 1);
    assert.equal(rounds[1]!.sequence, 2);
  });
});

describe("generation preview", () => {
  it("produces verifiable preview token", () => {
    const preview = buildGenerationPreview({
      mode: "single_round_robin",
      participantIds: ["p1", "p2", "p3"],
    });
    assert.ok(preview.previewToken.length > 0);
    assert.equal(preview.blockingErrors.length, 0);
    assert.ok(
      verifyPreviewToken(preview.previewToken, {
        rounds: preview.rounds,
        mode: "single_round_robin",
      }),
    );
  });

  it("maps match score choices to game outcomes", () => {
    const result = computeMatchOutcome(gamesFromMatchScore("2-1"));
    assert.equal(result.outcome, "playerAWin");
    assert.equal(formatMatchScore(result), "2-1");
    const draw = computeMatchOutcome(gamesFromMatchScore("draw"));
    assert.equal(draw.outcome, "draw");
    assert.equal(formatMatchScore(draw), "Draw");
  });

  it("verifies token after JSONB round-trip key reordering", () => {
    const preview = buildGenerationPreview({
      mode: "single_round_robin",
      participantIds: ["p1", "p2", "p3", "p4"],
    });
    const reordered = JSON.parse(JSON.stringify(preview.rounds)) as typeof preview.rounds;
    reordered.forEach((round) => {
      round.fixtures = round.fixtures.map((f) => ({
        isBye: f.isBye,
        participantBId: f.participantBId,
        participantAId: f.participantAId,
      }));
    });
    assert.ok(
      verifyPreviewToken(preview.previewToken, {
        rounds: reordered,
        mode: "single_round_robin",
      }),
    );
  });
});
