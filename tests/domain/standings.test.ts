import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rebuildStandings } from "../../lib/domain/standings";

describe("standings rebuild", () => {
  it("ranks by match points deterministically", () => {
    const standings = rebuildStandings({
      seasonId: "season-1",
      participantIds: ["p1", "p2", "p3"],
      matches: [
        {
          participantAId: "p1",
          participantBId: "p2",
          outcome: "playerAWin",
          pointsPlayerA: 3,
          pointsPlayerB: 0,
          gamesWonA: 2,
          gamesWonB: 0,
          gamesDrawn: 0,
        },
        {
          participantAId: "p1",
          participantBId: "p3",
          outcome: "playerBWin",
          pointsPlayerA: 0,
          pointsPlayerB: 3,
          gamesWonA: 1,
          gamesWonB: 2,
          gamesDrawn: 0,
        },
      ],
    });
    assert.equal(standings[0]!.participantId, "p3");
    assert.equal(standings[0]!.matchPoints, 3);
    assert.equal(standings[1]!.participantId, "p1");
    assert.equal(standings[1]!.matchPoints, 3);
    assert.equal(standings[2]!.matchPoints, 0);
  });

  it("includes participants with zero matches", () => {
    const standings = rebuildStandings({
      seasonId: "season-1",
      participantIds: ["p1", "p2"],
      matches: [],
    });
    assert.equal(standings.length, 2);
    assert.equal(standings[0]!.matchesPlayed, 0);
  });

  it("is stable for identical inputs", () => {
    const input = {
      seasonId: "season-1",
      participantIds: ["p2", "p1"],
      matches: [
        {
          participantAId: "p1",
          participantBId: "p2",
          outcome: "draw" as const,
          pointsPlayerA: 1,
          pointsPlayerB: 1,
          gamesWonA: 0,
          gamesWonB: 0,
          gamesDrawn: 3,
        },
      ],
      rebuiltAt: "2026-01-01T00:00:00.000Z",
    };
    assert.deepEqual(rebuildStandings(input), rebuildStandings(input));
  });
});
