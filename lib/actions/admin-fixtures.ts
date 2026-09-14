"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type SeasonFixtureSummary = {
  seasonId: string;
  label: string;
  roundCount: number;
  fixtureCount: number;
};

export async function getSeasonFixtureSummaryAction(
  seasonId: string,
): Promise<SeasonFixtureSummary | null> {
  await requireSiteAdmin();
  const admin = createAdminClient();

  const { data: season } = await admin
    .from("seasons")
    .select("id, name, competitions(name)")
    .eq("id", seasonId)
    .maybeSingle();
  if (!season) return null;

  const { count: roundCount } = await admin
    .from("rounds")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);

  const { count: fixtureCount } = await admin
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);

  const competition = Array.isArray(season.competitions)
    ? season.competitions[0]
    : season.competitions;

  return {
    seasonId,
    label: competition?.name ? `${competition.name} — ${season.name}` : season.name,
    roundCount: roundCount ?? 0,
    fixtureCount: fixtureCount ?? 0,
  };
}

/** Remove all rounds, fixtures, match results, and standings for a season. Site admin only. */
export async function clearSeasonFixturesAction(seasonId: string) {
  await requireSiteAdmin();
  const admin = createAdminClient();

  const { data: season } = await admin.from("seasons").select("id").eq("id", seasonId).maybeSingle();
  if (!season) throw new Error("Season not found");

  const { count: fixtureCount } = await admin
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);

  const { error: roundsError } = await admin.from("rounds").delete().eq("season_id", seasonId);
  if (roundsError) throw new Error(roundsError.message);

  await admin.from("standings").delete().eq("season_id", seasonId);
  await admin.from("generation_previews").delete().eq("season_id", seasonId);
  await admin.from("idempotency_keys").delete().eq("season_id", seasonId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/organizer");
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  revalidatePath("/calendar");
  revalidatePath(`/seasons/${seasonId}`);
  revalidatePath(`/seasons/${seasonId}/schedule`);

  return { clearedFixtures: fixtureCount ?? 0 };
}
