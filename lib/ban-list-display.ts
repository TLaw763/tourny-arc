import type { SeasonBanListEntry } from "@/lib/domain/types";

export function formatBanListEntryLabel(entry: SeasonBanListEntry) {
  if (entry.genesysPoints != null && entry.genesysPoints > 0) {
    return `${entry.cardName} (${entry.genesysPoints} pts)`;
  }
  return entry.cardName;
}
