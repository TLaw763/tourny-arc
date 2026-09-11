"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isOrganizerForSeason, getMembershipForUser } from "@/lib/auth";
import { newId } from "@/lib/db/ids";
import {
  canTransitionFixture,
  isFixtureMutable,
  sanitizeDisplayText,
  validateStreamUrl,
} from "@/lib/domain";

export async function proposeScheduleAction(
  fixtureId: string,
  proposedStartAt: string,
  note?: string,
) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");
  if (!isFixtureMutable(fixture.state)) throw new Error("Fixture is closed");

  const membership = await getMembershipForUser(session.userId, fixture.season_id);
  if (!membership) throw new Error("Forbidden");

  const now = new Date().toISOString();
  await admin.from("schedule_proposals").insert({
    id: newId("proposal"),
    fixture_id: fixtureId,
    proposer_membership_id: membership.id,
    proposed_start_at: proposedStartAt,
    note: note ? sanitizeDisplayText(note, 500) : null,
    status: "pending",
    version: 1,
    created_at: now,
  });

  if (canTransitionFixture(fixture.state, "time_proposed")) {
    await admin
      .from("fixtures")
      .update({ state: "time_proposed", updated_at: now })
      .eq("id", fixtureId);
  }

  revalidatePath("/my-fixtures");
  revalidatePath("/organizer");
}

export async function confirmScheduleAction(fixtureId: string, confirmedStartAt: string) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");
  if (!(await isOrganizerForSeason(session.userId, fixture.season_id))) {
    throw new Error("Forbidden");
  }
  if (!isFixtureMutable(fixture.state)) throw new Error("Fixture is closed");

  const now = new Date().toISOString();
  await admin
    .from("fixtures")
    .update({
      confirmed_start_at: confirmedStartAt,
      state: "confirmed",
      updated_at: now,
    })
    .eq("id", fixtureId);

  revalidatePath("/organizer");
  revalidatePath("/calendar");
}

export async function postponeFixtureAction(fixtureId: string) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");
  if (!(await isOrganizerForSeason(session.userId, fixture.season_id))) {
    throw new Error("Forbidden");
  }
  if (!canTransitionFixture(fixture.state, "postponed")) {
    throw new Error("Cannot postpone fixture in current state");
  }

  const now = new Date().toISOString();
  await admin
    .from("fixtures")
    .update({ state: "postponed", updated_at: now })
    .eq("id", fixtureId);

  revalidatePath("/organizer");
  revalidatePath("/calendar");
}

export async function cancelFixtureAction(fixtureId: string) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");
  if (!(await isOrganizerForSeason(session.userId, fixture.season_id))) {
    throw new Error("Forbidden");
  }
  if (!canTransitionFixture(fixture.state, "cancelled")) {
    throw new Error("Cannot cancel fixture in current state");
  }

  const now = new Date().toISOString();
  await admin
    .from("fixtures")
    .update({ state: "cancelled", updated_at: now })
    .eq("id", fixtureId);

  // Void pending match results
  const { data: matches } = await admin.from("matches").select("id").eq("fixture_id", fixtureId);
  for (const match of matches ?? []) {
    await admin
      .from("matches")
      .update({ outcome: null, points_player_a: 0, points_player_b: 0 })
      .eq("id", match.id);
    await admin.from("games").delete().eq("match_id", match.id);
  }

  revalidatePath("/organizer");
  revalidatePath("/calendar");
}

export async function addStreamLinkAction(
  fixtureId: string,
  url: string,
  label?: string,
  visibility: "organizer_only" | "public" = "public",
) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: fixture } = await admin.from("fixtures").select("*").eq("id", fixtureId).single();
  if (!fixture) throw new Error("Fixture not found");
  if (!(await isOrganizerForSeason(session.userId, fixture.season_id))) {
    throw new Error("Forbidden");
  }

  const urlCheck = validateStreamUrl(url);
  if (!urlCheck.ok) throw new Error(urlCheck.code);

  const membership = await getMembershipForUser(session.userId, fixture.season_id);
  if (!membership) throw new Error("Forbidden");

  const now = new Date().toISOString();
  await admin.from("stream_links").insert({
    id: newId("stream"),
    fixture_id: fixtureId,
    url,
    label: label ? sanitizeDisplayText(label, 100) : null,
    visibility,
    approved_by_membership_id: membership.id,
    created_at: now,
  });

  revalidatePath("/organizer");
  revalidatePath(`/fixtures/${fixtureId}`);
}
