import type { BanListCategory } from "@/lib/domain/types";
import {
  copiesAllowedToCategory,
  fetchMasterDuelLimitRegulation,
  masterDuelSourceNote,
} from "@/lib/yaml-yugi/client";
import type {
  ReferenceBanlistFormat,
  YgoProDeckBanStatus,
  YgoProDeckBanlistRow,
  YgoProDeckCardSummary,
} from "@/lib/ygoprodeck/types";

const API_BASE = "https://db.ygoprodeck.com/api/v7";
const LEGACY_BANLIST = "https://db.ygoprodeck.com/api/banlist.php";

type CardInfoResponse = {
  data?: Array<{
    id: number;
    name: string;
    banlist_info?: {
      ban_tcg?: YgoProDeckBanStatus;
      ban_ocg?: YgoProDeckBanStatus;
    };
    misc_info?: Array<{
      genesys_points?: number;
      formats?: string[];
      konami_id?: number;
    }>;
  }>;
  error?: string;
};

export type ReferenceBanlistRow = {
  cardId: number;
  cardName: string;
  category: BanListCategory | null;
  genesysPoints: number | null;
};

export type FetchedReferenceBanlist = {
  rows: ReferenceBanlistRow[];
  sourceNote: string;
};

const KONAMI_LOOKUP_BATCH_SIZE = 15;

export function tcgStatusToCategory(status: string | null | undefined): BanListCategory | null {
  switch (status) {
    case "Forbidden":
      return "forbidden";
    case "Limited":
      return "limited";
    case "Semi-Limited":
      return "semi_limited";
    default:
      return null;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`YGOProDeck request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function lookupCardByKonamiId(konamiId: string): Promise<{ id: number; name: string } | null> {
  const url = `${API_BASE}/cardinfo.php?konami_id=${encodeURIComponent(konamiId)}`;
  const payload = await fetchJson<CardInfoResponse>(url);
  if (payload.error) return null;

  const card = payload.data?.[0];
  if (!card) return null;

  return { id: card.id, name: card.name };
}

async function resolveKonamiRegulationEntries(
  entries: Array<[string, 0 | 1 | 2]>,
): Promise<ReferenceBanlistRow[]> {
  const rows: ReferenceBanlistRow[] = [];

  for (let index = 0; index < entries.length; index += KONAMI_LOOKUP_BATCH_SIZE) {
    const batch = entries.slice(index, index + KONAMI_LOOKUP_BATCH_SIZE);
    const resolved = await Promise.all(
      batch.map(async ([konamiId, copies]) => {
        const card = await lookupCardByKonamiId(konamiId);
        return {
          cardId: card?.id ?? Number(konamiId),
          cardName: card?.name ?? `Konami #${konamiId}`,
          category: copiesAllowedToCategory(copies),
          genesysPoints: null,
        } satisfies ReferenceBanlistRow;
      }),
    );

    rows.push(...resolved);

    if (index + KONAMI_LOOKUP_BATCH_SIZE < entries.length) {
      await delay(150);
    }
  }

  return rows.sort((a, b) => a.cardName.localeCompare(b.cardName));
}

/** Fuzzy card name search for autocomplete. */
export async function searchYgoProDeckCards(
  query: string,
  limit = 8,
): Promise<YgoProDeckCardSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${API_BASE}/cardinfo.php?fname=${encodeURIComponent(trimmed)}&num=${limit}&offset=0&misc=yes`;
  const payload = await fetchJson<CardInfoResponse>(url);
  if (payload.error) throw new Error(payload.error);

  return (payload.data ?? []).map((card) => ({
    id: card.id,
    name: card.name,
    banTcg: card.banlist_info?.ban_tcg ?? null,
    genesysPoints: card.misc_info?.[0]?.genesys_points ?? null,
  }));
}

function unwrapBanlistPayload(payload: YgoProDeckBanlistRow[] | YgoProDeckBanlistRow[][]): YgoProDeckBanlistRow[] {
  if (payload.length === 0) return [];
  // banlist.php returns [[...cards]] — a single outer array wrapping the list.
  if (Array.isArray(payload[0])) return payload[0] as YgoProDeckBanlistRow[];
  return payload as YgoProDeckBanlistRow[];
}

/** Official TCG F&L list via banlist.php. */
export async function fetchTcgReferenceBanlist(): Promise<FetchedReferenceBanlist> {
  const payload = await fetchJson<YgoProDeckBanlistRow[] | YgoProDeckBanlistRow[][]>(
    `${LEGACY_BANLIST}?banlist=${encodeURIComponent("TCG")}`,
  );
  const rows = unwrapBanlistPayload(payload);

  const mapped = rows.flatMap((row) => {
    const category = tcgStatusToCategory(row.ban_tcg);
    if (!category) return [];
    return [
      {
        cardId: row.id,
        cardName: row.name,
        category,
        genesysPoints: null,
      },
    ];
  });

  return {
    rows: mapped,
    sourceNote: REFERENCE_BANLIST_SOURCE_NOTES.tcg,
  };
}

/** Master Duel F&L via YAML Yugi; card names resolved through YGOProDeck. */
export async function fetchMasterDuelReferenceBanlist(): Promise<FetchedReferenceBanlist> {
  const { date, regulation } = await fetchMasterDuelLimitRegulation();
  const entries = Object.entries(regulation) as Array<[string, 0 | 1 | 2]>;
  const rows = await resolveKonamiRegulationEntries(entries);

  return {
    rows,
    sourceNote: masterDuelSourceNote(date),
  };
}

/** Genesys point costs (not a traditional F&L list). */
export async function fetchGenesysReferenceBanlist(): Promise<FetchedReferenceBanlist> {
  const rows: ReferenceBanlistRow[] = [];
  const pageSize = 100;
  let offset = 0;

  const maxPages = 150;
  for (let page = 0; page < maxPages; page += 1) {
    const url = `${API_BASE}/cardinfo.php?format=genesys&misc=yes&num=${pageSize}&offset=${offset}`;
    const payload = await fetchJson<CardInfoResponse>(url);
    if (payload.error) throw new Error(payload.error);

    const batch = payload.data ?? [];
    if (batch.length === 0) break;

    for (const card of batch) {
      const points = card.misc_info?.[0]?.genesys_points ?? 0;
      if (points <= 0) continue;
      rows.push({
        cardId: card.id,
        cardName: card.name,
        category: "unlimited",
        genesysPoints: points,
      });
    }

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return {
    rows,
    sourceNote: REFERENCE_BANLIST_SOURCE_NOTES.genesys,
  };
}

export async function fetchReferenceBanlist(format: ReferenceBanlistFormat): Promise<FetchedReferenceBanlist> {
  switch (format) {
    case "tcg":
      return fetchTcgReferenceBanlist();
    case "master_duel":
      return fetchMasterDuelReferenceBanlist();
    case "genesys":
      return fetchGenesysReferenceBanlist();
  }
}

export const REFERENCE_BANLIST_SOURCE_NOTES: Record<ReferenceBanlistFormat, string> = {
  tcg: "Synced from YGOProDeck banlist.php (TCG).",
  master_duel: "Synced from YAML Yugi Master Duel limit regulation. Card names resolved via YGOProDeck.",
  genesys:
    "Synced from YGOProDeck Genesys point values (format=genesys). Genesys uses a point cap, not the TCG F&L list.",
};
