"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isOrganizerForSeason, getMembershipForUser } from "@/lib/auth";
import { getOpenMatchForFixture, getPrimaryMatchForFixture } from "@/lib/db/fixture-matches";
import { newId } from "@/lib/db/ids";
import {
  advanceFixtureToResultPending,
  computeMatchOutcome,
  type ScoringGame,
} from "@/lib/domain";
import { rebuildStandingsAction } from "./standings";

export async function submitResultAction(fixtureId: string, games: ScoringGame[]) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");

  const membership = await getMembershipForUser(session.userId, fixture.season_id);
  const isOrganizer = await isOrganizerForSeason(session.userId, fixture.season_id);
  if (!membership && !isOrganizer) throw new Error("Forbidden");

  const match = await getOpenMatchForFixture(admin, fixtureId);
  if (!match) throw new Error("No open match");

  const score = computeMatchOutcome(games);
  const now = new Date().toISOString();

  await admin
    .from("matches")
    .update({
      outcome: score.outcome,
      points_player_a: score.pointsPlayerA,
      points_player_b: score.pointsPlayerB,
      finalization_version: 1,
    })
    .eq("id", match.id);

  await admin.from("games").delete().eq("match_id", match.id);
  for (const g of games) {
    await admin.from("games").insert({
      id: newId("game"),
      match_id: match.id,
      sequence: g.sequence,
      outcome: g.outcome,
    });
  }

  const submitterId = membership?.id ?? (
    await admin
      .from("memberships")
      .select("id")
      .eq("season_id", fixture.season_id)
      .eq("customer_account_id", session.userId)
      .single()
  ).data?.id;

  await admin.from("result_submissions").insert({
    id: newId("result"),
    match_id: match.id,
    submitter_membership_id: submitterId!,
    state: "submitted",
    payload: { games },
    version: 1,
    created_at: now,
    updated_at: now,
  });

  const nextState = advanceFixtureToResultPending(fixture.state);
  if (nextState) {
    await admin
      .from("fixtures")
      .update({ state: nextState, updated_at: now })
      .eq("id", fixtureId);
  }

  revalidatePath("/my-fixtures");
  revalidatePath("/organizer");
}

export async function finalizeResultAction(fixtureId: string) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");

  const isOrganizer = await isOrganizerForSeason(session.userId, fixture.season_id);
  const membership = await getMembershipForUser(session.userId, fixture.season_id);
  if (!isOrganizer && !membership) throw new Error("Forbidden");

  const match = await getPrimaryMatchForFixture(admin, fixtureId);
  if (!match) throw new Error("No match");

  const { data: submission } = await admin
    .from("result_submissions")
    .select("*")
    .eq("match_id", match.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!submission) throw new Error("No submission");

  const now = new Date().toISOString();
  await admin
    .from("result_submissions")
    .update({ state: "finalized", updated_at: now })
    .eq("id", submission.id);

  await admin
    .from("fixtures")
    .update({ state: "finalized", updated_at: now })
    .eq("id", fixtureId);

  await rebuildStandingsAction(fixture.season_id);

  revalidatePath("/standings");
  revalidatePath("/organizer");
  revalidatePath("/my-fixtures");
}

export async function correctResultAction(fixtureId: string, games: ScoringGame[]) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");
  if (!(await isOrganizerForSeason(session.userId, fixture.season_id))) {
    throw new Error("Forbidden");
  }

  const match = await getPrimaryMatchForFixture(admin, fixtureId);
  if (!match) throw new Error("No match");

  const score = computeMatchOutcome(games);
  const now = new Date().toISOString();

  await admin
    .from("matches")
    .update({
      outcome: score.outcome,
      points_player_a: score.pointsPlayerA,
      points_player_b: score.pointsPlayerB,
      finalization_version: (match.finalization_version ?? 0) + 1,
    })
    .eq("id", match.id);

  await admin.from("games").delete().eq("match_id", match.id);
  for (const g of games) {
    await admin.from("games").insert({
      id: newId("game"),
      match_id: match.id,
      sequence: g.sequence,
      outcome: g.outcome,
    });
  }

  await admin.from("result_submissions").insert({
    id: newId("result"),
    match_id: match.id,
    submitter_membership_id: (
      await admin
        .from("memberships")
        .select("id")
        .eq("season_id", fixture.season_id)
        .eq("customer_account_id", session.userId)
        .single()
    ).data!.id,
    state: "corrected",
    payload: { games },
    version: 1,
    created_at: now,
    updated_at: now,
  });

  await admin
    .from("fixtures")
    .update({ state: "finalized", updated_at: now })
    .eq("id", fixtureId);

  await rebuildStandingsAction(fixture.season_id);

  revalidatePath("/standings");
  revalidatePath("/organizer");
}
