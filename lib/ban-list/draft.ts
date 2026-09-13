import type { BanListCategory, GamePlatform, SeasonBanListEntry } from "@/lib/domain/types";

export type BanListDraftEntry = {
  cardName: string;
  cardId: number | null;
  category: BanListCategory;
  genesysPoints: number | null;
};

export type BanListDraftRow = BanListDraftEntry & {
  clientId: string;
};

function entrySignature(entry: BanListDraftEntry) {
  return `${entry.cardName.trim().toLowerCase()}|${entry.category}|${entry.cardId ?? ""}|${entry.genesysPoints ?? ""}`;
}

export function banListDraftSignature(entries: BanListDraftEntry[]) {
  return entries.map(entrySignature).sort().join("\n");
}

export function isBanListDraftDirty(
  savedEntries: SeasonBanListEntry[],
  draftEntries: BanListDraftEntry[],
  savedPlatform: GamePlatform | null,
  draftPlatform: GamePlatform | null,
) {
  if (savedPlatform !== draftPlatform) return true;
  const savedDraft = savedEntries.map((entry) => ({
    cardName: entry.cardName,
    cardId: entry.cardId,
    category: entry.category,
    genesysPoints: entry.genesysPoints,
  }));
  return banListDraftSignature(savedDraft) !== banListDraftSignature(draftEntries);
}

export function toBanListDraftEntry(entry: SeasonBanListEntry): BanListDraftEntry {
  return {
    cardName: entry.cardName,
    cardId: entry.cardId,
    category: entry.category,
    genesysPoints: entry.genesysPoints,
  };
}

export function toBanListDraftRow(entry: SeasonBanListEntry): BanListDraftRow {
  return {
    clientId: entry.id,
    ...toBanListDraftEntry(entry),
  };
}

export function createDraftClientId() {
  return `draft_${crypto.randomUUID()}`;
}
