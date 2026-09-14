"use client";

import { useState } from "react";
import { GenerationPreviewEditor } from "@/components/generation-preview-editor";
import {
  commitMdLeagueImportAction,
  previewMdLeagueImportAction,
} from "@/lib/actions/md-league-import";
import type { PairingRound } from "@/lib/domain/pairing";
import type { FixtureImportMeta } from "@/lib/fixture-import/types";

type Participant = { id: string; display_name: string };

type MdLeagueImportPanelProps = {
  seasonId: string;
  participants: Participant[];
};

const PREVIEW_EDITOR_MAX_MATCHUPS = 50;

function countMatchups(rounds: PairingRound[]) {
  return rounds.reduce((sum, round) => sum + round.fixtures.filter((f) => !f.isBye).length, 0);
}

export function MdLeagueImportPanel({ seasonId, participants }: MdLeagueImportPanelProps) {
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewRounds, setPreviewRounds] = useState<PairingRound[] | null>(null);
  const [fixtureMeta, setFixtureMeta] = useState<FixtureImportMeta[]>([]);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFetchPreview() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const preview = await previewMdLeagueImportAction(seasonId);
      if (preview.blockingErrors.length) {
        setError(preview.blockingErrors.join("; "));
        setPreviewRounds(null);
        setFixtureMeta([]);
        return;
      }
      setPreviewRounds(preview.rounds);
      setFixtureMeta(preview.fixtureMeta);
      setPreviewDirty(false);
      setSummary(
        `${preview.sourceFixtureCount} fixtures from Master Duel League · ${preview.scoredFixtureCount} with results`,
      );
      if (preview.warnings.length) {
        setMessage(preview.warnings.join("; "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!previewRounds?.length) return;
    const roundsToCommit = previewRounds;
    const metaToCommit = fixtureMeta;
    setCommitting(true);
    setPreviewRounds(null);
    setFixtureMeta([]);
    setPreviewDirty(false);
    setMessage(null);
    setError(null);
    try {
      const result = await commitMdLeagueImportAction(seasonId, roundsToCommit, metaToCommit);
      setSummary(null);
      setMessage(
        `Imported ${result.importedFixtures} fixtures` +
          (result.importedScores ? ` (${result.importedScores} with scores)` : "") +
          (result.scoreWarnings.length ? `. Warnings: ${result.scoreWarnings.join("; ")}` : ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="panel-subtle space-y-4 p-4">
      <div className="space-y-1">
        <h3 className="font-semibold">Import from Master Duel League</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Pull fixtures live from{" "}
          <a href="https://md-league.vercel.app/fixtures" target="_blank" rel="noreferrer">
            md-league.vercel.app
          </a>
          . Prefer a file? Run <code className="text-xs">pnpm md-league:export-csv</code> and use
          Import from CSV above.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" disabled={busy} onClick={handleFetchPreview}>
          {busy ? "Loading…" : "Load fixtures"}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={committing || !previewRounds?.length}
          onClick={handleCommit}
        >
          {committing ? "Importing…" : "Import fixtures"}
        </button>
      </div>

      {summary && <p className="text-sm text-[var(--color-text-muted)]">{summary}</p>}
      {previewDirty && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Schedule edited — your changes will be imported as shown.
        </p>
      )}
      {message && <p className="text-sm text-[var(--color-success)]">{message}</p>}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {previewRounds && previewRounds.length > 0 && (
        countMatchups(previewRounds) <= PREVIEW_EDITOR_MAX_MATCHUPS ? (
          <GenerationPreviewEditor
            rounds={previewRounds}
            participants={participants}
            onChange={(rounds) => {
              setPreviewRounds(rounds);
              setPreviewDirty(true);
            }}
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Large import ({countMatchups(previewRounds)} matchups) — schedule editor hidden for
            performance. Import uses the loaded schedule as-is.
          </p>
        )
      )}
    </div>
  );
}
