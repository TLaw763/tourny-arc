import type { GameOutcome, MatchOutcome } from "@/lib/domain/types";
import {
  DEFAULT_GAMES_TO_WIN_MATCH,
  DEFAULT_MATCH_POINTS,
} from "@/lib/domain/types";

export type ScoringGame = {
  sequence: number;
  outcome: GameOutcome;
  /** Required when outcome is `forfeit` — which side forfeited the game. */
  forfeitedSide?: "A" | "B";
};

export type MatchScoreResult = {
  outcome: MatchOutcome;
  pointsPlayerA: number;
  pointsPlayerB: number;
  gamesWonA: number;
  gamesWonB: number;
  gamesDrawn: number;
  clinched: boolean;
};

export type ScoringOptions = {
  gamesToWin?: number;
  matchPointsWin?: number;
  matchPointsDraw?: number;
  matchPointsLoss?: number;
};

function gameCountsTowardClinch(outcome: GameOutcome): boolean {
  return outcome === "playerAWin" || outcome === "playerBWin" || outcome === "forfeit";
}

/** Compute match outcome and league points from explicit game results (best-of-N). */
export function computeMatchOutcome(
  games: ScoringGame[],
  options: ScoringOptions = {},
): MatchScoreResult {
  const gamesToWin = options.gamesToWin ?? DEFAULT_GAMES_TO_WIN_MATCH;
  const winPts = options.matchPointsWin ?? DEFAULT_MATCH_POINTS.win;
  const drawPts = options.matchPointsDraw ?? DEFAULT_MATCH_POINTS.draw;
  const lossPts = options.matchPointsLoss ?? DEFAULT_MATCH_POINTS.loss;

  const sorted = [...games].sort((a, b) => a.sequence - b.sequence);
  let gamesWonA = 0;
  let gamesWonB = 0;
  let gamesDrawn = 0;
  let matchForfeitA = false;
  let matchForfeitB = false;
  let allVoid = sorted.length > 0;
  let clinched = false;

  for (const game of sorted) {
    if (clinched && gameCountsTowardClinch(game.outcome)) {
      continue;
    }

    switch (game.outcome) {
      case "playerAWin":
        gamesWonA++;
        allVoid = false;
        break;
      case "playerBWin":
        gamesWonB++;
        allVoid = false;
        break;
      case "draw":
        gamesDrawn++;
        allVoid = false;
        break;
      case "forfeit":
        allVoid = false;
        if (game.forfeitedSide === "A") {
          matchForfeitA = true;
          gamesWonB++;
        } else if (game.forfeitedSide === "B") {
          matchForfeitB = true;
          gamesWonA++;
        } else {
          throw new Error("forfeitedSide required when game outcome is forfeit");
        }
        break;
      case "void":
        break;
      case "unplayed":
        allVoid = false;
        break;
    }

    if (
      !clinched &&
      (gamesWonA >= gamesToWin ||
        gamesWonB >= gamesToWin ||
        matchForfeitA ||
        matchForfeitB)
    ) {
      clinched = true;
    }
  }

  if (matchForfeitA) {
    return {
      outcome: "forfeitA",
      pointsPlayerA: lossPts,
      pointsPlayerB: winPts,
      gamesWonA,
      gamesWonB,
      gamesDrawn,
      clinched: true,
    };
  }
  if (matchForfeitB) {
    return {
      outcome: "forfeitB",
      pointsPlayerA: winPts,
      pointsPlayerB: lossPts,
      gamesWonA,
      gamesWonB,
      gamesDrawn,
      clinched: true,
    };
  }
  if (sorted.length > 0 && allVoid) {
    return {
      outcome: "void",
      pointsPlayerA: 0,
      pointsPlayerB: 0,
      gamesWonA: 0,
      gamesWonB: 0,
      gamesDrawn: 0,
      clinched: true,
    };
  }

  if (gamesWonA >= gamesToWin) {
    return {
      outcome: "playerAWin",
      pointsPlayerA: winPts,
      pointsPlayerB: lossPts,
      gamesWonA,
      gamesWonB,
      gamesDrawn,
      clinched: true,
    };
  }
  if (gamesWonB >= gamesToWin) {
    return {
      outcome: "playerBWin",
      pointsPlayerA: lossPts,
      pointsPlayerB: winPts,
      gamesWonA,
      gamesWonB,
      gamesDrawn,
      clinched: true,
    };
  }

  if (gamesDrawn > 0 && gamesWonA === gamesWonB && gamesWonA < gamesToWin) {
    return {
      outcome: "draw",
      pointsPlayerA: drawPts,
      pointsPlayerB: drawPts,
      gamesWonA,
      gamesWonB,
      gamesDrawn,
      clinched: sorted.length >= gamesToWin * 2 - 1,
    };
  }

  return {
    outcome: "draw",
    pointsPlayerA: drawPts,
    pointsPlayerB: drawPts,
    gamesWonA,
    gamesWonB,
    gamesDrawn,
    clinched: false,
  };
}

/** Summarize game results as a human-readable score (e.g. "2-1"). */
export function formatMatchScore(result: MatchScoreResult): string {
  if (result.outcome === "forfeitA") return "Forfeit (A)";
  if (result.outcome === "forfeitB") return "Forfeit (B)";
  if (result.outcome === "void") return "Void";
  if (result.outcome === "draw") return "Draw";
  return `${result.gamesWonA}-${result.gamesWonB}`;
}

export type MatchScoreChoice = "2-0" | "2-1" | "0-2" | "1-2" | "draw";

export const MATCH_SCORE_OPTIONS: Array<{ value: MatchScoreChoice; label: string }> = [
  { value: "2-0", label: "2–0" },
  { value: "2-1", label: "2–1" },
  { value: "1-2", label: "1–2" },
  { value: "0-2", label: "0–2" },
  { value: "draw", label: "Draw" },
];

/** Map a best-of-3 match score selection to underlying game outcomes. */
export function gamesFromMatchScore(choice: MatchScoreChoice): ScoringGame[] {
  switch (choice) {
    case "2-0":
      return [
        { sequence: 1, outcome: "playerAWin" },
        { sequence: 2, outcome: "playerAWin" },
      ];
    case "2-1":
      return [
        { sequence: 1, outcome: "playerAWin" },
        { sequence: 2, outcome: "playerBWin" },
        { sequence: 3, outcome: "playerAWin" },
      ];
    case "0-2":
      return [
        { sequence: 1, outcome: "playerBWin" },
        { sequence: 2, outcome: "playerBWin" },
      ];
    case "1-2":
      return [
        { sequence: 1, outcome: "playerAWin" },
        { sequence: 2, outcome: "playerBWin" },
        { sequence: 3, outcome: "playerBWin" },
      ];
    case "draw":
      return [
        { sequence: 1, outcome: "draw" },
        { sequence: 2, outcome: "draw" },
      ];
  }
}

export function countGameResults(games: Array<{ outcome: string }>) {
  let gamesWonA = 0;
  let gamesWonB = 0;
  let gamesDrawn = 0;
  for (const game of games) {
    if (game.outcome === "playerAWin") gamesWonA++;
    else if (game.outcome === "playerBWin") gamesWonB++;
    else if (game.outcome === "draw") gamesDrawn++;
  }
  return { gamesWonA, gamesWonB, gamesDrawn };
}
