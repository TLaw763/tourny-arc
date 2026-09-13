"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createCompetitionWizardAction,
  previewFormatPlanAction,
} from "@/lib/actions/competition";
import { parseRosterLine } from "@/lib/roster-parse";
import type {
  CompetitionFormatTemplate,
  CreateCompetitionWizardRequest,
  FormatPlanPreview,
  GamePlatform,
  ScheduleGenerationMode,
} from "@/lib/domain/types";
import { GAME_PLATFORMS, gamePlatformLabel } from "@/lib/game-platform";

const STEPS = ["Basics", "Format", "Configure", "Players", "Review"] as const;

export default function CreateCompetitionPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FormatPlanPreview | null>(null);

  const [form, setForm] = useState<CreateCompetitionWizardRequest>({
    name: "",
    visibility: "public",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    seasonName: "Season 1",
    gamePlatform: "master_duel",
    template: "league",
    leagueMode: "single_round_robin",
    rosterPlayers: [],
  });

  const [rosterInput, setRosterInput] = useState("");

  function update<K extends keyof CreateCompetitionWizardRequest>(
    key: K,
    value: CreateCompetitionWizardRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function goReview() {
    const players = rosterInput
      .split("\n")
      .map((line) => parseRosterLine(line))
      .filter((player) => player.displayName);
    const body = { ...form, rosterPlayers: players };
    try {
      const p = await previewFormatPlanAction(body, players.length || undefined);
      setPreview(p);
      setForm(body);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    }
  }

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const rosterPlayers = rosterInput
        .split("\n")
        .map((line) => parseRosterLine(line))
        .filter((player) => player.displayName);
      const { seasonId } = await createCompetitionWizardAction({ ...form, rosterPlayers });
      router.push(`/organizer?seasonId=${seasonId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create competition</h1>
        <Link href="/organizer" className="text-sm">
          ← Back
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={
              i === step
                ? "font-semibold text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)]"
            }
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <div className="panel space-y-4 p-6">
        {step === 0 && (
          <>
            <h2 className="font-semibold">Basics</h2>
            <input
              className="field-input"
              placeholder="Competition name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
            <input
              className="field-input"
              placeholder="Season name"
              value={form.seasonName}
              onChange={(e) => update("seasonName", e.target.value)}
            />
            <label className="space-y-1 text-sm">
              <span className="font-medium">Play platform</span>
              <select
                className="field-select"
                value={form.gamePlatform ?? ""}
                onChange={(e) =>
                  update("gamePlatform", (e.target.value || null) as GamePlatform | null)
                }
              >
                <option value="" disabled>
                  Select platform…
                </option>
                {GAME_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {gamePlatformLabel(platform)}
                  </option>
                ))}
              </select>
            </label>
            <select
              className="field-select"
              value={form.visibility}
              onChange={(e) =>
                update("visibility", e.target.value as "public" | "private")
              }
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <input
              className="field-input"
              placeholder="Timezone"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
            <input
              className="field-input"
              placeholder="Logo image URL (optional)"
              value={form.logoUrl ?? ""}
              onChange={(e) => update("logoUrl", e.target.value || null)}
            />
            <input
              className="field-input"
              placeholder="Cover image URL (optional)"
              value={form.coverImageUrl ?? ""}
              onChange={(e) => update("coverImageUrl", e.target.value || null)}
            />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-semibold">Format template</h2>
            {(["league", "swiss", "bracket", "hybrid_swiss_cut"] as CompetitionFormatTemplate[]).map(
              (t) => (
                <label key={t} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="template"
                    checked={form.template === t}
                    onChange={() => update("template", t)}
                  />
                  {t.replace(/_/g, " ")}
                </label>
              ),
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold">Configure</h2>
            {form.template === "league" && (
              <select
                className="field-select"
                value={form.leagueMode}
                onChange={(e) =>
                  update("leagueMode", e.target.value as ScheduleGenerationMode)
                }
              >
                <option value="single_round_robin">Single round-robin</option>
                <option value="double_round_robin">Double round-robin</option>
                <option value="manual">Manual schedule import</option>
              </select>
            )}
            {form.template !== "league" && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Swiss and bracket formats are saved in your plan. Automated pairing for those
                phases is coming soon — use league format for full generation today.
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold">Roster (optional)</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              One player per line. Optional username: <code>Name | username</code> or{" "}
              <code>Name, username</code>. Roster-only players do not need accounts.
            </p>
            <textarea
              className="field-input min-h-32"
              placeholder={"Alice | AliceYGO\nBob\nCharlie, CharlieMD"}
              value={rosterInput}
              onChange={(e) => setRosterInput(e.target.value)}
            />
          </>
        )}

        {step === 4 && preview && (
          <>
            <h2 className="font-semibold">Review</h2>
            <p>
              <strong>{form.name}</strong> — {preview.templateLabel}
            </p>
            {form.gamePlatform && (
              <p className="text-sm text-[var(--color-text-muted)]">
                Platform: {gamePlatformLabel(form.gamePlatform)}
              </p>
            )}
            <ul className="list-disc pl-5 text-sm">
              {preview.phases.map((p) => (
                <li key={p.sequence}>
                  {p.label}: {p.summary} ({p.automationStatus})
                </li>
              ))}
            </ul>
            {preview.notes.map((note, i) => (
              <p key={i} className="text-sm text-[var(--color-text-muted)]">
                {note}
              </p>
            ))}
          </>
        )}

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="flex gap-2 pt-2">
          {step > 0 && step < 4 && (
            <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && (!form.name.trim() || !form.gamePlatform)}
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button type="button" className="btn-primary" onClick={goReview}>
              Preview & review
            </button>
          )}
          {step === 4 && (
            <button type="button" className="btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? "Creating…" : "Create competition"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
