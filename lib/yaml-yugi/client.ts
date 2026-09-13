import type { BanListCategory } from "@/lib/domain/types";
import type { YamlYugiCopiesAllowed, YamlYugiLimitRegulation } from "@/lib/yaml-yugi/types";

const MASTER_DUEL_VECTOR_URL =
  "https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json";

export function copiesAllowedToCategory(copies: YamlYugiCopiesAllowed): BanListCategory {
  switch (copies) {
    case 0:
      return "forbidden";
    case 1:
      return "limited";
    case 2:
      return "semi_limited";
  }
}

export async function fetchMasterDuelLimitRegulation(): Promise<YamlYugiLimitRegulation> {
  const response = await fetch(MASTER_DUEL_VECTOR_URL, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`YAML Yugi request failed (${response.status})`);
  }

  const payload = (await response.json()) as YamlYugiLimitRegulation;
  if (!payload.date || !payload.regulation) {
    throw new Error("YAML Yugi returned an unexpected Master Duel regulation payload");
  }

  return payload;
}

export function masterDuelSourceNote(effectiveDate: string) {
  return `Synced from YAML Yugi Master Duel limit regulation (effective ${effectiveDate}). Card names resolved via YGOProDeck konami_id lookup.`;
}
