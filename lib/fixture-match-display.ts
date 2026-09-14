import { countGameResults } from "@/lib/domain/scoring";

export type FixtureWinnerSide = "a" | "b" | "draw" | null;

export type FixtureMatchDisplay = {
  isPlayed: boolean;
  centerScore: string;
  winnerSide: FixtureWinnerSide;
  wonLabel: string | null;
  gamesWonA: number;
  gamesWonB: number;
};

function inferGameCountsFromOutcome(outcome: string) {
  if (outcome === "playerAWin" || outcome === "forfeitB") {
    return { gamesWonA: 2, gamesWonB: 0 };
  }
  if (outcome === "playerBWin" || outcome === "forfeitA") {
    return { gamesWonA: 0, gamesWonB: 2 };
  }
  return { gamesWonA: 0, gamesWonB: 0 };
}

export function buildFixtureMatchDisplay(
  state: string,
  matchOutcome: string | null | undefined,
  games: Array<{ outcome: string }> | undefined,
): FixtureMatchDisplay {
  const isPlayed = state === "finalized" && Boolean(matchOutcome);

  if (!isPlayed) {
    return {
      isPlayed: false,
      centerScore: "VS",
      winnerSide: null,
      wonLabel: null,
      gamesWonA: 0,
      gamesWonB: 0,
    };
  }

  if (matchOutcome === "draw") {
    return {
      isPlayed: true,
      centerScore: "Draw",
      winnerSide: "draw",
      wonLabel: null,
      gamesWonA: 0,
      gamesWonB: 0,
    };
  }

  if (matchOutcome === "void") {
    return {
      isPlayed: true,
      centerScore: "Void",
      winnerSide: null,
      wonLabel: null,
      gamesWonA: 0,
      gamesWonB: 0,
    };
  }

  if (matchOutcome === "forfeitA") {
    return {
      isPlayed: true,
      centerScore: "FF",
      winnerSide: "b",
      wonLabel: "WON FF",
      gamesWonA: 0,
      gamesWonB: 2,
    };
  }

  if (matchOutcome === "forfeitB") {
    return {
      isPlayed: true,
      centerScore: "FF",
      winnerSide: "a",
      wonLabel: "WON FF",
      gamesWonA: 2,
      gamesWonB: 0,
    };
  }

  const gameList = games ?? [];
  const { gamesWonA, gamesWonB } =
    gameList.length > 0
      ? countGameResults(gameList)
      : inferGameCountsFromOutcome(matchOutcome ?? "");

  const centerScore = `${gamesWonA}–${gamesWonB}`;

  let winnerSide: FixtureWinnerSide = null;
  if (matchOutcome === "playerAWin") winnerSide = "a";
  else if (matchOutcome === "playerBWin") winnerSide = "b";

  let wonLabel: string | null = null;
  if (winnerSide === "a") {
    wonLabel = `WON ${gamesWonA}–${gamesWonB}`;
  } else if (winnerSide === "b") {
    wonLabel = `WON ${gamesWonB}–${gamesWonA}`;
  }

  return {
    isPlayed: true,
    centerScore,
    winnerSide,
    wonLabel,
    gamesWonA,
    gamesWonB,
  };
}
