"use server";

import { revalidatePath } from "next/cache";
import { isOrganizerForSeason, requireAuth } from "@/lib/auth";
import { applyReferenceBanlistToSeason } from "@/lib/ban-list/apply-reference";
import { newId } from "@/lib/db/ids";
import { isBanListCategory } from "@/lib/domain/ban-list";
import { sanitizeDisplayText } from "@/lib/domain";
import type { BanListCategory, GamePlatform } from "@/lib/domain/types";
import { isGamePlatform, resolveGamePlatform } from "@/lib/game-platform";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireOrganizer(seasonId: string) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function upsertBanListEntryAction(
  seasonId: string,
  cardName: string,
  category: BanListCategory,
  options?: { cardId?: number | null; genesysPoints?: number | null },
) {
  await requireOrganizer(seasonId);

  const normalizedName = sanitizeDisplayText(cardName.trim(), 200);
  if (!normalizedName) throw new Error("Card name is required");
  if (!isBanListCategory(category)) throw new Error("Invalid category");

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("season_ban_list_entries")
    .select("id")
    .eq("season_id", seasonId)
    .eq("card_name", normalizedName)
    .maybeSingle();

  const { error } = await admin.from("season_ban_list_entries").upsert(
    {
      id: existing?.id ?? newId("ban-entry"),
      season_id: seasonId,
      card_name: normalizedName,
      card_id: options?.cardId ?? null,
      category,
      genesys_points: options?.genesysPoints ?? null,
      updated_at: now,
      ...(existing ? {} : { created_at: now }),
    },
    { onConflict: "season_id,card_name" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/organizer");
  revalidatePath(`/seasons/${seasonId}`);
}

export async function updateBanListEntryCategoryAction(
  seasonId: string,
  entryId: string,
  category: BanListCategory,
) {
  await requireOrganizer(seasonId);
  if (!isBanListCategory(category)) throw new Error("Invalid category");

  const admin = createAdminClient();
  const { error } = await admin
    .from("season_ban_list_entries")
    .update({ category, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("season_id", seasonId);

  if (error) throw new Error(error.message);

  revalidatePath("/organizer");
  revalidatePath(`/seasons/${seasonId}`);
}

export async function removeBanListEntryAction(seasonId: string, entryId: string) {
  await requireOrganizer(seasonId);

  const admin = createAdminClient();
  const { error } = await admin
    .from("season_ban_list_entries")
    .delete()
    .eq("id", entryId)
    .eq("season_id", seasonId);

  if (error) throw new Error(error.message);

  revalidatePath("/organizer");
  revalidatePath(`/seasons/${seasonId}`);
}

/** Copy site reference list into this season (upsert; keeps extra custom cards). */
export async function applyReferenceBanlistToSeasonAction(seasonId: string) {
  await requireOrganizer(seasonId);
  const admin = createAdminClient();

  const { data: seasonRow } = await admin
    .from("seasons")
    .select("competitions(game_platform, name)")
    .eq("id", seasonId)
    .single();

  const competition = Array.isArray(seasonRow?.competitions)
    ? seasonRow.competitions[0]
    : seasonRow?.competitions;
  const platform = resolveGamePlatform(
    competition?.game_platform as string | null | undefined,
    competition?.name as string | null | undefined,
  );
  if (!platform) {
    throw new Error("Choose a play platform below before importing a reference list.");
  }

  const result = await applyReferenceBanlistToSeason(admin, seasonId, platform);
  if (!result) {
    throw new Error(
      "No reference list synced yet for this format. Ask the site admin to sync YGOProDeck data.",
    );
  }

  revalidatePath("/organizer");
  revalidatePath(`/seasons/${seasonId}`);

  return result;
}

/** Reference list rows for a platform — does not write to the season. */
export async function fetchReferenceBanlistDraftAction(
  seasonId: string,
  platform: GamePlatform,
) {
  await requireOrganizer(seasonId);
  if (!isGamePlatform(platform)) throw new Error("Invalid play platform");

  const admin = createAdminClient();
  const { data: referenceRows, error: refError } = await admin
    .from("reference_banlist_entries")
    .select("card_id, card_name, category, genesys_points")
    .eq("format", platform);

  if (refError) throw new Error(refError.message);
  if (!referenceRows?.length) {
    throw new Error(
      "No reference list synced yet for this format. Ask the site admin to sync YGOProDeck data.",
    );
  }

  return referenceRows.map((row) => ({
    cardName: row.card_name,
    cardId: row.card_id,
    category: row.category as BanListCategory,
    genesysPoints: row.genesys_points,
  }));
}

export async function saveSeasonBanListAction(
  seasonId: string,
  payload: {
    gamePlatform: GamePlatform | null;
    entries: Array<{
      cardName: string;
      cardId: number | null;
      category: BanListCategory;
      genesysPoints: number | null;
    }>;
  },
) {
  await requireOrganizer(seasonId);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", seasonId)
    .single();
  if (!season) throw new Error("Season not found");

  if (payload.gamePlatform) {
    if (!isGamePlatform(payload.gamePlatform)) throw new Error("Invalid play platform");
    const { error: platformError } = await admin
      .from("competitions")
      .update({ game_platform: payload.gamePlatform, updated_at: now })
      .eq("id", season.competition_id);

    if (platformError?.message?.toLowerCase().includes("game_platform")) {
      throw new Error("Run migration 008_competition_game_platform.sql in Supabase, then try again.");
    }
    if (platformError) throw new Error(platformError.message);
  }

  for (const entry of payload.entries) {
    const normalizedName = sanitizeDisplayText(entry.cardName.trim(), 200);
    if (!normalizedName) throw new Error("Every card must have a name");
    if (!isBanListCategory(entry.category)) throw new Error("Invalid ban list category");
  }

  const { error: deleteError } = await admin
    .from("season_ban_list_entries")
    .delete()
    .eq("season_id", seasonId);
  if (deleteError) throw new Error(deleteError.message);

  if (payload.entries.length > 0) {
    const insertRows = payload.entries.map((entry) => ({
      id: newId("ban-entry"),
      season_id: seasonId,
      card_name: sanitizeDisplayText(entry.cardName.trim(), 200),
      card_id: entry.cardId,
      category: entry.category,
      genesys_points: entry.genesysPoints,
      created_at: now,
      updated_at: now,
    }));

    const batchSize = 100;
    for (let offset = 0; offset < insertRows.length; offset += batchSize) {
      const batch = insertRows.slice(offset, offset + batchSize);
      const { error: insertError } = await admin.from("season_ban_list_entries").insert(batch);
      if (insertError) throw new Error(insertError.message);
    }
  }

  revalidatePath("/organizer");
  revalidatePath(`/seasons/${seasonId}`);
  revalidatePath(`/seasons/${seasonId}/ban-list`);

  return { saved: payload.entries.length };
}
