"use client";

import { useEffect, useMemo, useState } from "react";
import { BanListDragBoard } from "@/components/ban-list-drag-board";
import { CardNameAutocomplete } from "@/components/card-name-autocomplete";
import { OrganizerCollapsibleSection } from "@/components/organizer-collapsible-section";
import {
  fetchReferenceBanlistDraftAction,
  saveSeasonBanListAction,
} from "@/lib/actions/ban-list";
import { BAN_LIST_CATEGORIES, BAN_LIST_CATEGORY_LABELS } from "@/lib/domain/ban-list";
import type { BanListCategory, GamePlatform, SeasonBanListEntry } from "@/lib/domain/types";
import { GAME_PLATFORMS, gamePlatformLabel, isGamePlatform } from "@/lib/game-platform";
import {
  createDraftClientId,
  isBanListDraftDirty,
  toBanListDraftRow,
  type BanListDraftRow,
} from "@/lib/ban-list/draft";
import type { YgoProDeckCardSummary } from "@/lib/ygoprodeck/types";

type TournamentBanListEditorProps = {
  seasonId: string;
  storedGamePlatform: GamePlatform | null;
  entries: SeasonBanListEntry[];
  onChange: () => Promise<void>;
};

export function TournamentBanListEditor({
  seasonId,
  storedGamePlatform,
  entries,
  onChange,
}: TournamentBanListEditorProps) {
  const [draftPlatform, setDraftPlatform] = useState<GamePlatform | null>(storedGamePlatform);
  const [draftEntries, setDraftEntries] = useState<BanListDraftRow[]>(() =>
    entries.map(toBanListDraftRow),
  );
  const [cardName, setCardName] = useState("");
  const [selectedCard, setSelectedCard] = useState<YgoProDeckCardSummary | null>(null);
  const [category, setCategory] = useState<BanListCategory>("forbidden");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftPlatform(storedGamePlatform);
    setDraftEntries(entries.map(toBanListDraftRow));
    setStatus(null);
    setError(null);
  }, [entries, storedGamePlatform, seasonId]);

  const isDirty = useMemo(
    () => isBanListDraftDirty(entries, draftEntries, storedGamePlatform, draftPlatform),
    [draftEntries, draftPlatform, entries, storedGamePlatform],
  );

  function applySuggestedCategory(card: YgoProDeckCardSummary) {
    if (card.genesysPoints != null && card.genesysPoints > 0) return "unlimited" as const;
    if (card.banTcg === "Forbidden") return "forbidden" as const;
    if (card.banTcg === "Limited") return "limited" as const;
    if (card.banTcg === "Semi-Limited") return "semi_limited" as const;
    return category;
  }

  function handleAddCard() {
    const trimmed = cardName.trim();
    if (!trimmed) return;

    setDraftEntries((current) => {
      const existing = current.find(
        (entry) => entry.cardName.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) {
        return current.map((entry) =>
          entry.clientId === existing.clientId
            ? {
                ...entry,
                category,
                cardId: selectedCard?.id ?? entry.cardId,
                genesysPoints: selectedCard?.genesysPoints ?? entry.genesysPoints,
              }
            : entry,
        );
      }

      return [
        ...current,
        {
          clientId: createDraftClientId(),
          cardName: trimmed,
          cardId: selectedCard?.id ?? null,
          category,
          genesysPoints: selectedCard?.genesysPoints ?? null,
        },
      ];
    });

    setCardName("");
    setSelectedCard(null);
    setError(null);
  }

  function handleDiscard() {
    setDraftPlatform(storedGamePlatform);
    setDraftEntries(entries.map(toBanListDraftRow));
    setStatus(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus("Saving ban list…");
    try {
      const result = await saveSeasonBanListAction(seasonId, {
        gamePlatform: draftPlatform,
        entries: draftEntries.map(({ cardName, cardId, category, genesysPoints }) => ({
          cardName,
          cardId,
          category,
          genesysPoints,
        })),
      });
      setStatus(`Saved ${result.saved} cards.`);
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setStatus(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!draftPlatform) {
      setError("Choose a play platform before importing a reference list.");
      return;
    }

    setImporting(true);
    setError(null);
    setStatus(`Loading official ${gamePlatformLabel(draftPlatform)} list…`);
    try {
      const imported = await fetchReferenceBanlistDraftAction(seasonId, draftPlatform);
      setDraftEntries(
        imported.map((entry) => ({
          clientId: createDraftClientId(),
          ...entry,
        })),
      );
      setStatus(
        `Loaded ${imported.length} cards into the editor. Save when you are ready to publish.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStatus(null);
    } finally {
      setImporting(false);
    }
  }

  const uiLocked = saving || importing;

  return (
    <OrganizerCollapsibleSection
      title="Tournament ban list"
      onUpdate={handleSave}
      disabled={!isDirty}
      loading={saving}
      defaultOpen={false}
      hint={
        isDirty
          ? "Publish ban list changes to the tournament."
          : "Drag cards between columns — update when you have changes to publish."
      }
    >
      {isDirty && (
        <div className="ban-list-unsaved panel-subtle flex flex-wrap items-center justify-between gap-3 p-3">
          <p className="text-sm font-medium">Unsaved ban list changes</p>
          <button
            type="button"
            className="btn-secondary"
            disabled={uiLocked}
            onClick={handleDiscard}
          >
            Discard changes
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1 space-y-1">
          <span className="text-sm font-medium">Play platform</span>
          <select
            className="field-select w-full"
            value={draftPlatform ?? ""}
            disabled={uiLocked}
            onChange={(e) => {
              const value = e.target.value;
              if (!isGamePlatform(value)) return;
              setDraftPlatform(value);
              setError(null);
            }}
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
      </div>

      {(importing || saving) && status && (
        <div
          className="ban-list-status panel-subtle space-y-2 p-3"
          role="status"
          aria-live="polite"
          aria-busy={importing || saving}
        >
          <div className="form-progress">
            <div className="form-progress-track form-progress-track--indeterminate">
              <div className="form-progress-fill form-progress-fill--indeterminate" />
            </div>
            <span className="form-progress-label">{status}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={uiLocked || !draftPlatform}
          aria-busy={importing}
          onClick={() => void handleImport()}
        >
          {importing
            ? "Loading…"
            : `Import official ${draftPlatform ? gamePlatformLabel(draftPlatform) : "format"} list`}
        </button>
      </div>

      {!importing && !saving && status && !error && (
        <p className="text-sm text-[var(--color-success)]" role="status">
          {status}
        </p>
      )}

      <form
        className="flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleAddCard();
        }}
      >
        <div className="min-w-[12rem] flex-1">
          <CardNameAutocomplete
            value={cardName}
            disabled={uiLocked}
            onValueChange={(value) => {
              setCardName(value);
              if (selectedCard && selectedCard.name !== value) setSelectedCard(null);
            }}
            onSelect={(card) => {
              setSelectedCard(card);
              setCategory(applySuggestedCategory(card));
            }}
          />
        </div>
        <select
          className="field-select max-w-[11rem]"
          value={category}
          onChange={(e) => setCategory(e.target.value as BanListCategory)}
          disabled={uiLocked}
        >
          {BAN_LIST_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {BAN_LIST_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary" disabled={uiLocked || !cardName.trim()}>
          Add to draft
        </button>
      </form>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {draftEntries.length > 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Drag a card by the handle (⠿) into another column. Remember to update when you are done.
        </p>
      )}

      <BanListDragBoard
        entries={draftEntries}
        disabled={uiLocked}
        onMove={(clientId, nextCategory) => {
          setDraftEntries((current) =>
            current.map((entry) =>
              entry.clientId === clientId ? { ...entry, category: nextCategory } : entry,
            ),
          );
          setError(null);
        }}
        onRemove={(clientId) => {
          setDraftEntries((current) => current.filter((entry) => entry.clientId !== clientId));
          setError(null);
        }}
      />
    </OrganizerCollapsibleSection>
  );
}
