"use client";

import { useState } from "react";
import {
  gamesFromMatchScore,
  MATCH_SCORE_OPTIONS,
  type MatchScoreChoice,
  type ScoringGame,
} from "@/lib/domain/scoring";

export function ResultEntry({
  playerAName,
  playerBName,
  onSubmit,
}: {
  playerAName?: string;
  playerBName?: string;
  onSubmit: (games: ScoringGame[]) => Promise<void>;
}) {
  const [score, setScore] = useState<MatchScoreChoice | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!score) {
      setError("Select a match score");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(gamesFromMatchScore(score));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  const scoreLabel =
    playerAName && playerBName
      ? `Score (${playerAName} – ${playerBName})`
      : "Match score";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <fieldset className="space-y-2 border-0 p-0">
        <legend className="mb-2 text-sm font-medium">{scoreLabel}</legend>
        <div className="score-picker" role="group" aria-label={scoreLabel}>
          {MATCH_SCORE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                score === option.value ? "score-picker-btn score-picker-btn--active" : "score-picker-btn"
              }
              aria-pressed={score === option.value}
              onClick={() => setScore(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-[var(--color-text-muted)]">
        Scores are from the first player listed (2–0 = first player wins both games).
      </p>
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading || !score}>
        {loading ? "Submitting…" : "Submit result"}
      </button>
    </form>
  );
}
