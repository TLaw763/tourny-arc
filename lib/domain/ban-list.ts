import type { BanListCategory, SeasonBanListEntry } from "@/lib/domain/types";

export const BAN_LIST_CATEGORIES: BanListCategory[] = [
  "forbidden",
  "limited",
  "semi_limited",
  "unlimited",
];

export const BAN_LIST_CATEGORY_LABELS: Record<BanListCategory, string> = {
  forbidden: "Forbidden",
  limited: "Limited",
  semi_limited: "Semi-Limited",
  unlimited: "Unlimited",
};

export function groupBanListByCategory(entries: SeasonBanListEntry[]) {
  const grouped: Record<BanListCategory, SeasonBanListEntry[]> = {
    forbidden: [],
    limited: [],
    semi_limited: [],
    unlimited: [],
  };

  for (const entry of entries) {
    grouped[entry.category].push(entry);
  }

  for (const category of BAN_LIST_CATEGORIES) {
    grouped[category].sort((a, b) => a.cardName.localeCompare(b.cardName));
  }

  return grouped;
}

export function isBanListCategory(value: string): value is BanListCategory {
  return (BAN_LIST_CATEGORIES as string[]).includes(value);
}
