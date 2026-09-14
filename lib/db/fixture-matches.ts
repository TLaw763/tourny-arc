import type { SupabaseClient } from "@supabase/supabase-js";
import { newId } from "@/lib/db/ids";

type MatchRow = {
  id: string;
  fixture_id: string;
  sequence: number;
  outcome: string | null;
  points_player_a: number;
  points_player_b: number;
  finalization_version: number;
};

/** Create any missing match rows for a fixture (e.g. legacy fixtures generated without matches). */
export async function ensureFixtureMatches(
  admin: SupabaseClient,
  fixtureId: string,
): Promise<void> {
  const { data: fixture } = await admin
    .from("fixtures")
    .select("matches_per_fixture")
    .eq("id", fixtureId)
    .single();
  if (!fixture) return;

  const { data: existing } = await admin
    .from("matches")
    .select("sequence")
    .eq("fixture_id", fixtureId);

  const existingSequences = new Set((existing ?? []).map((m) => m.sequence));
  const needed = fixture.matches_per_fixture ?? 1;

  for (let seq = 1; seq <= needed; seq++) {
    if (existingSequences.has(seq)) continue;
    await admin.from("matches").insert({
      id: newId("match"),
      fixture_id: fixtureId,
      sequence: seq,
      points_player_a: 0,
      points_player_b: 0,
      finalization_version: 0,
    });
  }
}

/** First unscored match for a fixture, creating rows if the fixture has none. */
export async function getOpenMatchForFixture(
  admin: SupabaseClient,
  fixtureId: string,
): Promise<MatchRow | null> {
  await ensureFixtureMatches(admin, fixtureId);

  const { data: openMatches, error } = await admin
    .from("matches")
    .select("*")
    .eq("fixture_id", fixtureId)
    .is("outcome", null)
    .order("sequence", { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);
  return (openMatches?.[0] as MatchRow | undefined) ?? null;
}

/** Primary match row for a fixture (scored or not). */
export async function getPrimaryMatchForFixture(
  admin: SupabaseClient,
  fixtureId: string,
): Promise<MatchRow | null> {
  await ensureFixtureMatches(admin, fixtureId);

  const { data: matches, error } = await admin
    .from("matches")
    .select("*")
    .eq("fixture_id", fixtureId)
    .order("sequence", { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);
  return (matches?.[0] as MatchRow | undefined) ?? null;
}
