"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/auth-admin";
import { newId } from "@/lib/db/ids";
import type { ReferenceBanlistFormat } from "@/lib/ygoprodeck/types";
import { fetchReferenceBanlist } from "@/lib/ygoprodeck/client";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReferenceBanlistMeta = {
  format: ReferenceBanlistFormat;
  syncedAt: string;
  entryCount: number;
  sourceNote: string;
};

export async function getReferenceBanlistMetaAction(): Promise<ReferenceBanlistMeta[]> {
  await requireSiteAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("reference_banlist_meta").select("*");

  if (error) {
    if (error.message.toLowerCase().includes("reference_banlist")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    format: row.format as ReferenceBanlistFormat,
    syncedAt: row.synced_at,
    entryCount: row.entry_count,
    sourceNote: row.source_note,
  }));
}

export async function syncReferenceBanlistAction(format: ReferenceBanlistFormat) {
  await requireSiteAdmin();

  const { rows, sourceNote } = await fetchReferenceBanlist(format);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: deleteError } = await admin
    .from("reference_banlist_entries")
    .delete()
    .eq("format", format);
  if (deleteError) throw new Error(deleteError.message);

  if (rows.length > 0) {
    const { error: insertError } = await admin.from("reference_banlist_entries").insert(
      rows.map((row) => ({
        id: newId("ref-ban"),
        format,
        card_id: row.cardId,
        card_name: row.cardName,
        category: row.category,
        genesys_points: row.genesysPoints,
        synced_at: now,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  const { error: metaError } = await admin.from("reference_banlist_meta").upsert({
    format,
    synced_at: now,
    entry_count: rows.length,
    source_note: sourceNote,
  });
  if (metaError) throw new Error(metaError.message);

  revalidatePath("/admin");
  revalidatePath("/organizer");

  return { format, entryCount: rows.length, syncedAt: now };
}
