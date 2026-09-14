"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  clearSeasonFixturesAction,
  type SeasonFixtureSummary,
} from "@/lib/actions/admin-fixtures";

type AdminClearFixturesPanelProps = {
  summary: SeasonFixtureSummary | null;
};

export function AdminClearFixturesPanel({ summary }: AdminClearFixturesPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    if (!summary) return;

    const confirmed = window.confirm(
      `Delete all fixtures for "${summary.label}"?\n\n` +
        `This removes ${summary.fixtureCount} fixture(s) across ${summary.roundCount} round(s), ` +
        "including schedules, scores, and standings. This cannot be undone.",
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await clearSeasonFixturesAction(summary.seasonId);
      setMessage(`Cleared ${result.clearedFixtures} fixture(s) for ${summary.label}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear fixtures");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Clear fixtures</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Remove every round and fixture for the currently selected tournament, including match
          results and standings. Rosters and ban lists are kept.
        </p>
      </div>

      {!summary ? (
        <p className="text-sm">
          No tournament selected.{" "}
          <Link href="/" className="no-underline">
            Choose a tournament on the home page
          </Link>{" "}
          first, then return here.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            Selected: <span className="font-medium">{summary.label}</span>
            {" · "}
            {summary.fixtureCount} fixture{summary.fixtureCount === 1 ? "" : "s"}
            {" · "}
            {summary.roundCount} round{summary.roundCount === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            className="btn-danger"
            disabled={busy || summary.fixtureCount === 0}
            onClick={handleClear}
          >
            {busy ? "Clearing…" : "Clear all fixtures"}
          </button>
          {summary.fixtureCount === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">No fixtures to clear.</p>
          )}
        </div>
      )}

      {message && <p className="text-sm text-[var(--color-success)]">{message}</p>}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
