import { newId } from "@/lib/db/ids";
import type { BanListCategory, GamePlatform, SeasonBanListEntry } from "@/lib/domain/types";
import { resolveGamePlatform } from "@/lib/game-platform";
import type { ReferenceBanlistFormat } from "@/lib/ygoprodeck/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type BanListRow = {
  id: string;
  season_id: string;
  card_name: string;
  card_id: number | null;
  category: string;
  genesys_points: number | null;
  updated_at: string;
};

function mapBanListRow(row: BanListRow): SeasonBanListEntry {
  return {
    id: row.id,
    seasonId: row.season_id,
    cardName: row.card_name,
    cardId: row.card_id ?? null,
    category: row.category as BanListCategory,
    genesysPoints: row.genesys_points ?? null,
    updatedAt: row.updated_at,
  };
}

async function fetchSeasonBanListRows(admin: AdminClient, seasonId: string): Promise<BanListRow[]> {
  const { data, error } = await admin
    .from("season_ban_list_entries")
    .select("id, season_id, card_name, card_id, category, genesys_points, updated_at")
    .eq("season_id", seasonId)
    .order("card_name");

  if (error?.message?.toLowerCase().includes("season_ban_list_entries")) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchSeasonGamePlatform(
  admin: AdminClient,
  seasonId: string,
): Promise<GamePlatform | null> {
  const { data: seasonRow } = await admin
    .from("seasons")
    .select("competitions(game_platform, name)")
    .eq("id", seasonId)
    .single();

  const competition = Array.isArray(seasonRow?.competitions)
    ? seasonRow.competitions[0]
    : seasonRow?.competitions;
  return resolveGamePlatform(
    competition?.game_platform as string | null | undefined,
    competition?.name as string | null | undefined,
  );
}

function platformToReferenceFormat(platform: GamePlatform): ReferenceBanlistFormat {
  return platform;
}

/** Copy synced site reference list into a season. No-op when reference data is missing. */
export async function applyReferenceBanlistToSeason(
  admin: AdminClient,
  seasonId: string,
  platform: GamePlatform,
): Promise<{ imported: number; format: ReferenceBanlistFormat } | null> {
  const format = platformToReferenceFormat(platform);
  const { data: referenceRows, error: refError } = await admin
    .from("reference_banlist_entries")
    .select("card_id, card_name, category, genesys_points")
    .eq("format", format);

  if (refError) {
    if (refError.message.toLowerCase().includes("reference_banlist")) return null;
    throw new Error(refError.message);
  }
  if (!referenceRows?.length) return null;

  const now = new Date().toISOString();
  const { data: existingRows } = await admin
    .from("season_ban_list_entries")
    .select("id, card_name")
    .eq("season_id", seasonId);

  const existingByName = new Map((existingRows ?? []).map((row) => [row.card_name, row.id]));
  const upsertRows = referenceRows.map((row) => {
    const existingId = existingByName.get(row.card_name);
    return {
      id: existingId ?? newId("ban-entry"),
      season_id: seasonId,
      card_id: row.card_id,
      card_name: row.card_name,
      category: row.category,
      genesys_points: row.genesys_points,
      updated_at: now,
      ...(existingId ? {} : { created_at: now }),
    };
  });

  const batchSize = 100;
  for (let offset = 0; offset < upsertRows.length; offset += batchSize) {
    const batch = upsertRows.slice(offset, offset + batchSize);
    const { error } = await admin
      .from("season_ban_list_entries")
      .upsert(batch, { onConflict: "season_id,card_name" });
    if (error) throw new Error(error.message);
  }

  return { imported: referenceRows.length, format };
}

/** Load a season ban list, seeding from the platform reference list when empty. */
export async function getSeasonBanListWithPlatformDefaults(
  seasonId: string,
): Promise<SeasonBanListEntry[]> {
  const admin = createAdminClient();
  let rows = await fetchSeasonBanListRows(admin, seasonId);

  if (!rows.length) {
    const platform = await fetchSeasonGamePlatform(admin, seasonId);
    if (platform) {
      try {
        const applied = await applyReferenceBanlistToSeason(admin, seasonId, platform);
        if (applied) rows = await fetchSeasonBanListRows(admin, seasonId);
      } catch {
        // Tables missing or reference data unavailable.
      }
    }
  }

  return rows.map(mapBanListRow);
}
