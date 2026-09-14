"use client";

import { useMemo, useState } from "react";
import { OrganizerCollapsibleSection } from "@/components/organizer-collapsible-section";
import { updateTournamentDetailsAction } from "@/lib/actions/competition";
import type {
  CompetitionStatus,
  CompetitionVisibility,
  GamePlatform,
  SeasonStatus,
  UpdateTournamentDetailsInput,
} from "@/lib/domain/types";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/fixture-display";
import { GAME_PLATFORMS, gamePlatformLabel, isGamePlatform } from "@/lib/game-platform";

type TournamentDetailsDraft = Omit<UpdateTournamentDetailsInput, "startsAt" | "endsAt"> & {
  startsAt: string | null;
  endsAt: string | null;
};

export type TournamentDetailsInitial = TournamentDetailsDraft;

type TournamentDetailsEditorProps = {
  seasonId: string;
  initial: TournamentDetailsInitial;
  onSaved: () => Promise<void>;
};

const COMPETITION_STATUSES: CompetitionStatus[] = ["draft", "active", "completed", "archived"];
const SEASON_STATUSES: SeasonStatus[] = ["draft", "active", "completed", "archived"];

function isoToDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  return toDatetimeLocalValue(new Date(value));
}

export function TournamentDetailsEditor({
  seasonId,
  initial,
  onSaved,
}: TournamentDetailsEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  function update<K extends keyof TournamentDetailsDraft>(
    key: K,
    value: TournamentDetailsDraft[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await updateTournamentDetailsAction(seasonId, {
        ...draft,
        startsAt: draft.startsAt
          ? fromDatetimeLocalValue(draft.startsAt)
          : null,
        endsAt: draft.endsAt ? fromDatetimeLocalValue(draft.endsAt) : null,
      });
      await onSaved();
      setStatus("Tournament details saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizerCollapsibleSection title="Tournament details" defaultOpen>
      <div className="organizer-details-form space-y-4">
        <div className="organizer-details-form-grid">
          <label className="organizer-details-field">
            <span className="organizer-details-label">Competition name</span>
            <input
              className="field-input"
              value={draft.competitionName}
              onChange={(e) => update("competitionName", e.target.value)}
            />
          </label>
          <label className="organizer-details-field">
            <span className="organizer-details-label">Season name</span>
            <input
              className="field-input"
              value={draft.seasonName}
              onChange={(e) => update("seasonName", e.target.value)}
            />
          </label>
        </div>

        <label className="organizer-details-field">
          <span className="organizer-details-label">Description</span>
          <textarea
            className="field-input min-h-[5rem] resize-y"
            value={draft.description ?? ""}
            onChange={(e) => update("description", e.target.value || null)}
            placeholder="Optional tournament description"
          />
        </label>

        <div className="organizer-details-form-grid">
          <label className="organizer-details-field">
            <span className="organizer-details-label">Visibility</span>
            <select
              className="field-select"
              value={draft.visibility}
              onChange={(e) => update("visibility", e.target.value as CompetitionVisibility)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="organizer-details-field">
            <span className="organizer-details-label">Timezone</span>
            <input
              className="field-input"
              value={draft.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
          </label>
          <label className="organizer-details-field">
            <span className="organizer-details-label">Play platform</span>
            <select
              className="field-select"
              value={draft.gamePlatform ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                update("gamePlatform", isGamePlatform(value) ? value : null);
              }}
            >
              <option value="">Not set</option>
              {GAME_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {gamePlatformLabel(platform)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="organizer-details-form-grid">
          <label className="organizer-details-field">
            <span className="organizer-details-label">Competition status</span>
            <select
              className="field-select"
              value={draft.competitionStatus}
              onChange={(e) =>
                update("competitionStatus", e.target.value as CompetitionStatus)
              }
            >
              {COMPETITION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="organizer-details-field">
            <span className="organizer-details-label">Season status</span>
            <select
              className="field-select"
              value={draft.seasonStatus}
              onChange={(e) => update("seasonStatus", e.target.value as SeasonStatus)}
            >
              {SEASON_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="organizer-details-form-grid">
          <label className="organizer-details-field">
            <span className="organizer-details-label">Season starts</span>
            <input
              type="datetime-local"
              className="field-input"
              value={draft.startsAt ?? ""}
              onChange={(e) => update("startsAt", e.target.value || null)}
            />
          </label>
          <label className="organizer-details-field">
            <span className="organizer-details-label">Season ends</span>
            <input
              type="datetime-local"
              className="field-input"
              value={draft.endsAt ?? ""}
              onChange={(e) => update("endsAt", e.target.value || null)}
            />
          </label>
        </div>

        <div className="organizer-details-form-grid">
          <label className="organizer-details-field">
            <span className="organizer-details-label">Logo image URL</span>
            <input
              className="field-input"
              value={draft.logoUrl ?? ""}
              onChange={(e) => update("logoUrl", e.target.value || null)}
              placeholder="https://…"
            />
          </label>
          <label className="organizer-details-field">
            <span className="organizer-details-label">Cover image URL</span>
            <input
              className="field-input"
              value={draft.coverImageUrl ?? ""}
              onChange={(e) => update("coverImageUrl", e.target.value || null)}
              placeholder="https://…"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={saving || !isDirty}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save details"}
          </button>
          {status && <span className="text-sm text-[var(--color-success)]">{status}</span>}
          {error && <span className="text-sm text-[var(--color-danger)]">{error}</span>}
        </div>
      </div>
    </OrganizerCollapsibleSection>
  );
}

export function tournamentDetailsFromContext(
  season: {
    name?: string;
    status?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    competitions?: unknown;
  } | null | undefined,
): TournamentDetailsInitial | null {
  if (!season) return null;

  const competition = Array.isArray(season.competitions)
    ? (season.competitions[0] as Record<string, unknown> | undefined)
    : (season.competitions as Record<string, unknown> | undefined);

  if (!competition) return null;

  const rawPlatform = competition.game_platform;
  const gamePlatform = isGamePlatform(rawPlatform as string) ? (rawPlatform as GamePlatform) : null;

  return {
    competitionName: String(competition.name ?? ""),
    seasonName: String(season.name ?? ""),
    description: (competition.description as string | null) ?? null,
    visibility: (competition.visibility as CompetitionVisibility) ?? "public",
    timezone: String(competition.timezone ?? "UTC"),
    startsAt: isoToDatetimeLocal(season.starts_at) || null,
    endsAt: isoToDatetimeLocal(season.ends_at) || null,
    logoUrl: (competition.logo_url as string | null) ?? null,
    coverImageUrl: (competition.cover_image_url as string | null) ?? null,
    gamePlatform,
    competitionStatus: (competition.status as CompetitionStatus) ?? "draft",
    seasonStatus: (season.status as SeasonStatus) ?? "draft",
  };
}
