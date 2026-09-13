"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isOrganizerForSeason } from "@/lib/auth";
import { rebuildStandings, type FinalizedMatchFact } from "@/lib/domain";
import type { MatchOutcome } from "@/lib/domain/types";

export async function rebuildStandingsAction(seasonId: string) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();
  const { data: ruleset } = await admin
    .from("rulesets")
    .select("*")
    .eq("season_id", seasonId)
    .single();
  if (!ruleset) throw new Error("Ruleset not found");

  const { data: memberships } = await admin
    .from("memberships")
    .select("participant_id")
    .eq("season_id", seasonId)
    .eq("eligible", true)
    .eq("role", "participant");
  const participantIds = (memberships ?? []).map((m) => m.participant_id);

  const { data: fixtures } = await admin
    .from("fixtures")
    .select("*")
    .eq("season_id", seasonId)
    .eq("state", "finalized")
    .eq("is_bye", false);

  const facts: FinalizedMatchFact[] = [];
  for (const fixture of fixtures ?? []) {
    const { data: match } = await admin
      .from("matches")
      .select("*, games(*)")
      .eq("fixture_id", fixture.id)
      .not("outcome", "is", null)
      .maybeSingle();
    if (!match?.outcome) continue;

    const games = (match.games as Array<{ outcome: string }>) ?? [];
    let gamesWonA = 0;
    let gamesWonB = 0;
    let gamesDrawn = 0;
    for (const g of games) {
      if (g.outcome === "playerAWin" || (g.outcome === "forfeit")) gamesWonA++;
      else if (g.outcome === "playerBWin") gamesWonB++;
      else if (g.outcome === "draw") gamesDrawn++;
    }

    facts.push({
      participantAId: fixture.participant_a_id,
      participantBId: fixture.participant_b_id,
      outcome: match.outcome as MatchOutcome,
      pointsPlayerA: match.points_player_a,
      pointsPlayerB: match.points_player_b,
      gamesWonA,
      gamesWonB,
      gamesDrawn,
    });
  }

  const rebuilt = rebuildStandings({
    seasonId,
    participantIds,
    matches: facts,
    tiebreakerOrder: ruleset.tiebreaker_order as string[],
  });

  await admin.from("standings").delete().eq("season_id", seasonId);
  if (rebuilt.length) {
    await admin.from("standings").insert(
      rebuilt.map((s) => ({
        participant_id: s.participantId,
        season_id: s.seasonId,
        rank: s.rank,
        matches_played: s.matchesPlayed,
        matches_won: s.matchesWon,
        matches_drawn: s.matchesDrawn,
        matches_lost: s.matchesLost,
        games_played: s.gamesPlayed,
        games_won: s.gamesWon,
        games_drawn: s.gamesDrawn,
        games_lost: s.gamesLost,
        match_points: s.matchPoints,
        tiebreaker_values: s.tiebreakerValues,
        rebuilt_at: s.rebuiltAt,
      })),
    );
  }

  revalidatePath("/standings");
  return rebuilt;
}

export async function getStandingsAction(seasonId: string) {
  const admin = createAdminClient();
  const { data: standings } = await admin
    .from("standings")
    .select("*, participants(display_name, online_client_username)")
    .eq("season_id", seasonId)
    .order("rank");

  return standings ?? [];
}
