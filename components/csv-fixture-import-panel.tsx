"use client";

import { useRef, useState } from "react";
import { GenerationPreviewEditor } from "@/components/generation-preview-editor";
import { commitCsvImportAction, previewCsvImportAction } from "@/lib/actions/csv-import";
import { FIXTURE_CSV_HEADERS } from "@/lib/fixture-import/csv";
import type { PairingRound } from "@/lib/domain/pairing";
import type { FixtureImportMeta } from "@/lib/fixture-import/types";

type Participant = { id: string; display_name: string };

type CsvFixtureImportPanelProps = {
  seasonId: string;
  participants: Participant[];
};

const SAMPLE_HEADER = FIXTURE_CSV_HEADERS.join(",");
const PREVIEW_EDITOR_MAX_MATCHUPS = 50;

function countMatchups(rounds: PairingRound[]) {
  return rounds.reduce((sum, round) => sum + round.fixtures.filter((f) => !f.isBye).length, 0);
}

export function CsvFixtureImportPanel({ seasonId, participants }: CsvFixtureImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewRounds, setPreviewRounds] = useState<PairingRound[] | null>(null);
  const [fixtureMeta, setFixtureMeta] = useState<FixtureImportMeta[]>([]);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPreview(text: string) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const preview = await previewCsvImportAction(seasonId, text);
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
        `${preview.sourceFixtureCount} rows · ${preview.scoredFixtureCount} with scores`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    await runPreview(text);
  }

  async function handlePreviewClick() {
    if (!csvText.trim()) {
      setError("Paste CSV content or choose a file first");
      return;
    }
    await runPreview(csvText);
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
      const result = await commitCsvImportAction(seasonId, roundsToCommit, metaToCommit);
      setSummary(null);
      setCsvText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        <h3 className="font-semibold">Import from CSV</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Upload a fixture export CSV. Players match your roster by display name and/or username.
          Columns: <code className="text-xs">{SAMPLE_HEADER}</code>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="field-input max-w-xs text-sm"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        <button type="button" className="btn-secondary" disabled={busy} onClick={handlePreviewClick}>
          {busy ? "Loading…" : "Preview CSV"}
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

      <textarea
        className="field-input min-h-[8rem] w-full font-mono text-xs"
        placeholder={`${SAMPLE_HEADER}\n1,Round 1,Alice,AliceGame,Bob,BobGame,2,0,,`}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />

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
            performance. Import uses the loaded CSV as-is.
          </p>
        )
      )}
    </div>
  );
}
