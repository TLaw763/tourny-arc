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

  it("breaks equal points by game difference", () => {
    const tiebreakerOrder = ["matchPoints", "gameDifference", "gamesTotal", "displayName"];
    const standings = rebuildStandings({
      seasonId: "season-1",
      participantIds: ["p1", "p2", "p3", "p4"],
      tiebreakerOrder,
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
          participantAId: "p3",
          participantBId: "p4",
          outcome: "playerAWin",
          pointsPlayerA: 3,
          pointsPlayerB: 0,
          gamesWonA: 2,
          gamesWonB: 1,
          gamesDrawn: 0,
        },
      ],
    });

    assert.deepEqual(
      standings.filter((row) => row.matchPoints === 3).map((row) => row.participantId),
      ["p1", "p3"],
    );
  });

  it("breaks equal points and game difference by fewer games played", () => {
    const tiebreakerOrder = ["matchPoints", "gameDifference", "gamesTotal", "displayName"];
    const standings = rebuildStandings({
      seasonId: "season-1",
      participantIds: ["efficient", "grinder", "d1", "d2", "d3", "d4", "d5", "d6", "d7"],
      tiebreakerOrder,
      matches: [
        // efficient: 6 pts, GD +1, 9 games (5 GW / 4 GL)
        { participantAId: "efficient", participantBId: "d1", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 0, gamesDrawn: 0 },
        { participantAId: "efficient", participantBId: "d2", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 1, gamesDrawn: 0 },
        { participantAId: "efficient", participantBId: "d3", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
        // grinder: 6 pts, GD +1, 11 games (6 GW / 5 GL)
        { participantAId: "grinder", participantBId: "d4", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 0, gamesDrawn: 0 },
        { participantAId: "grinder", participantBId: "d5", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 1, gamesDrawn: 0 },
        { participantAId: "grinder", participantBId: "d6", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
        { participantAId: "grinder", participantBId: "d7", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
      ],
    });

    assert.deepEqual(
      standings.filter((row) => row.matchPoints === 6).map((row) => row.participantId),
      ["efficient", "grinder"],
    );
    assert.equal(standings.find((row) => row.participantId === "efficient")!.gamesWon, 5);
    assert.equal(standings.find((row) => row.participantId === "grinder")!.gamesWon, 6);
  });

  it("ranks lower GW+GL above higher GW+GL when points and GD match", () => {
    const tiebreakerOrder = ["matchPoints", "gameDifference", "gamesTotal", "displayName"];
    const standings = rebuildStandings({
      seasonId: "season-1",
      participantIds: [
        "diego",
        "kriv",
        "cuan",
        "leo",
        "d1",
        "d2",
        "d3",
        "d4",
        "d5",
        "d6",
        "d7",
        "d8",
        "d9",
        "d10",
        "d11",
        "d12",
        "d13",
        "d14",
      ],
      participantNames: {
        diego: "DiegoLaw763",
        kriv: "KrivDeathwalker",
        cuan: "CuanLelouch",
        leo: "LeoGankTank",
      },
      tiebreakerOrder,
      matches: [
        // Diego: 6 pts, GD +1, GW+GL 9
        { participantAId: "diego", participantBId: "d1", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 0, gamesDrawn: 0 },
        { participantAId: "diego", participantBId: "d2", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 1, gamesDrawn: 0 },
        { participantAId: "diego", participantBId: "d3", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
        // Kriv: 6 pts, GD +1, GW+GL 9
        { participantAId: "kriv", participantBId: "d4", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 0, gamesDrawn: 0 },
        { participantAId: "kriv", participantBId: "d5", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 1, gamesDrawn: 0 },
        { participantAId: "kriv", participantBId: "d6", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
        // Cuan: 6 pts, GD +1, GW+GL 11
        { participantAId: "cuan", participantBId: "d7", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 0, gamesDrawn: 0 },
        { participantAId: "cuan", participantBId: "d8", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 1, gamesDrawn: 0 },
        { participantAId: "cuan", participantBId: "d9", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
        { participantAId: "cuan", participantBId: "d10", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
        // Leo: 6 pts, GD +1, GW+GL 11
        { participantAId: "leo", participantBId: "d11", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 0, gamesDrawn: 0 },
        { participantAId: "leo", participantBId: "d12", outcome: "playerAWin", pointsPlayerA: 3, pointsPlayerB: 0, gamesWonA: 2, gamesWonB: 1, gamesDrawn: 0 },
        { participantAId: "leo", participantBId: "d13", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
        { participantAId: "leo", participantBId: "d14", outcome: "playerBWin", pointsPlayerA: 0, pointsPlayerB: 3, gamesWonA: 1, gamesWonB: 2, gamesDrawn: 0 },
      ],
    });

    assert.deepEqual(
      standings
        .filter((row) => row.matchPoints === 6)
        .map((row) => row.participantId),
      ["diego", "kriv", "cuan", "leo"],
    );
  });

  it("breaks fully tied stats alphabetically by display name", () => {
    const tiebreakerOrder = ["matchPoints", "gameDifference", "gamesTotal", "displayName"];
    const standings = rebuildStandings({
      seasonId: "season-1",
      participantIds: ["p1", "p2", "a", "b"],
      participantNames: { p1: "Zara", p2: "Amy" },
      tiebreakerOrder,
      matches: [
        {
          participantAId: "p1",
          participantBId: "a",
          outcome: "playerAWin",
          pointsPlayerA: 3,
          pointsPlayerB: 0,
          gamesWonA: 2,
          gamesWonB: 0,
          gamesDrawn: 0,
        },
        {
          participantAId: "p2",
          participantBId: "b",
          outcome: "playerAWin",
          pointsPlayerA: 3,
          pointsPlayerB: 0,
          gamesWonA: 2,
          gamesWonB: 0,
          gamesDrawn: 0,
        },
      ],
    });

    assert.deepEqual(
      standings.filter((row) => row.matchPoints === 3).map((row) => row.participantId),
      ["p2", "p1"],
    );
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
