"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEnvOrganizerEmail } from "@/lib/auth-organizer";
import { isOrganizerForSeason, requireAuth } from "@/lib/auth";
import { newId } from "@/lib/db/ids";
import {
  buildPhasesFromTemplate,
  describeFormatPlan,
  leagueModeFromFormatPlan,
  sanitizeDisplayText,
  validateFormatWizardInput,
} from "@/lib/domain";
import {
  applyReferenceBanlistToSeason,
  getSeasonBanListWithPlatformDefaults,
} from "@/lib/ban-list/apply-reference";
import type {
  CreateCompetitionWizardRequest,
  FormatPlanPreview,
  GamePlatform,
} from "@/lib/domain/types";
import { isGamePlatform } from "@/lib/game-platform";

export async function previewFormatPlanAction(
  body: CreateCompetitionWizardRequest,
  participantCount?: number,
): Promise<FormatPlanPreview> {
  const errors = validateFormatWizardInput(body);
  if (errors.length) throw new Error(errors[0]!.message);
  const phases = buildPhasesFromTemplate(body);
  return describeFormatPlan(body.template, phases, participantCount);
}

export async function createCompetitionWizardAction(body: CreateCompetitionWizardRequest) {
  const session = await requireAuth();
  const errors = validateFormatWizardInput(body);
  if (errors.length) throw new Error(errors[0]!.message);

  const phases = buildPhasesFromTemplate(body);
  const rosterCount = body.rosterPlayers?.filter((p) => p.displayName.trim()).length ?? 0;
  const preview = describeFormatPlan(body.template, phases, rosterCount || undefined);
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const competitionId = newId("comp");
  const seasonId = newId("season");
  const rulesetId = newId("ruleset");
  const formatPlanId = newId("format-plan");
  const leagueMode = leagueModeFromFormatPlan(phases) ?? "single_round_robin";

  const competitionRow = {
    id: competitionId,
    name: sanitizeDisplayText(body.name, 200),
    description: body.description ? sanitizeDisplayText(body.description, 2000) : null,
    logo_url: body.logoUrl?.trim() || null,
    cover_image_url: body.coverImageUrl?.trim() || null,
    game_platform: body.gamePlatform ?? null,
    visibility: body.visibility,
    status: "draft",
    owner_customer_account_id: session.userId,
    timezone: body.timezone,
    created_at: now,
    updated_at: now,
  };

  let { error: compErr } = await admin.from("competitions").insert(competitionRow);
  if (compErr?.message?.toLowerCase().includes("game_platform")) {
    const { game_platform: omittedPlatform, ...withoutPlatform } = competitionRow;
    void omittedPlatform;
    ({ error: compErr } = await admin.from("competitions").insert(withoutPlatform));
  }
  if (compErr) throw new Error(compErr.message);

  const { error: seasonErr } = await admin.from("seasons").insert({
    id: seasonId,
    competition_id: competitionId,
    name: sanitizeDisplayText(body.seasonName, 200),
    status: "draft",
    starts_at: body.startsAt ?? null,
    ends_at: body.endsAt ?? null,
    created_at: now,
    updated_at: now,
  });
  if (seasonErr) throw new Error(seasonErr.message);

  await admin.from("rulesets").insert({
    id: rulesetId,
    season_id: seasonId,
    matches_per_fixture: 1,
    games_to_win_match: 2,
    match_points_win: 3,
    match_points_draw: 1,
    match_points_loss: 0,
    schedule_generation_mode: leagueMode,
    tiebreaker_order: ["matchPoints", "gameDifference", "gamesTotal", "displayName"],
    version: 1,
    created_at: now,
  });

  await admin.from("format_plans").insert({
    id: formatPlanId,
    season_id: seasonId,
    template: body.template,
    phases,
    created_at: now,
    updated_at: now,
  });

  // Organizer membership (without separate participant row for owner)
  const organizerParticipantId = newId("participant");
  await admin.from("participants").insert({
    id: organizerParticipantId,
    competition_id: competitionId,
    display_name: "Organizer",
    created_at: now,
    updated_at: now,
  });
  await admin.from("memberships").insert({
    id: newId("membership"),
    season_id: seasonId,
    participant_id: organizerParticipantId,
    customer_account_id: session.userId,
    role: "organizer",
    status: "active",
    eligible: false,
    created_at: now,
    updated_at: now,
  });

  if (body.rosterPlayers?.length) {
    for (const player of body.rosterPlayers) {
      const name = player.displayName.trim();
      if (!name) continue;
      const participantId = newId("participant");
      await admin.from("participants").insert({
        id: participantId,
        competition_id: competitionId,
        display_name: sanitizeDisplayText(name, 100),
        online_client_username: player.onlineClientUsername
          ? sanitizeDisplayText(player.onlineClientUsername, 64)
          : null,
        created_at: now,
        updated_at: now,
      });
      await admin.from("memberships").insert({
        id: newId("membership"),
        season_id: seasonId,
        participant_id: participantId,
        customer_account_id: null,
        role: "participant",
        status: "active",
        eligible: true,
        created_at: now,
        updated_at: now,
      });
    }
  }

  if (body.gamePlatform) {
    try {
      await applyReferenceBanlistToSeason(admin, seasonId, body.gamePlatform);
    } catch {
      // Tournament creation should succeed even if reference ban list tables are missing.
    }
  }

  await admin.from("audit_events").insert({
    id: newId("audit"),
    actor_customer_account_id: session.userId,
    action: "competition.wizard_created",
    target_type: "season",
    target_id: seasonId,
    after: { competitionId, template: body.template, gamePlatform: body.gamePlatform ?? null },
    occurred_at: now,
  });

  revalidatePath("/organizer");
  revalidatePath(`/seasons/${seasonId}`);
  return { competitionId, seasonId, preview };
}

export async function updateCompetitionGamePlatformAction(
  seasonId: string,
  gamePlatform: GamePlatform,
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }
  if (!isGamePlatform(gamePlatform)) throw new Error("Invalid play platform");

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", seasonId)
    .single();
  if (!season) throw new Error("Season not found");

  const now = new Date().toISOString();
  const { error } = await admin
    .from("competitions")
    .update({ game_platform: gamePlatform, updated_at: now })
    .eq("id", season.competition_id);

  if (error?.message?.toLowerCase().includes("game_platform")) {
    throw new Error("Run migration 008_competition_game_platform.sql in Supabase, then try again.");
  }
  if (error) throw new Error(error.message);

  const { data: existingBanList } = await admin
    .from("season_ban_list_entries")
    .select("id")
    .eq("season_id", seasonId)
    .limit(1);

  if (!existingBanList?.length) {
    try {
      await applyReferenceBanlistToSeason(admin, seasonId, gamePlatform);
    } catch {
      // Reference tables may not be synced yet.
    }
  }

  revalidatePath("/organizer");
  revalidatePath(`/seasons/${seasonId}`);
  revalidatePath(`/seasons/${seasonId}/ban-list`);
}

export async function addParticipantAction(
  seasonId: string,
  displayName: string,
  onlineClientUsername?: string,
) {
  const session = await requireAuth();
  const { isOrganizerForSeason } = await import("@/lib/auth");
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", seasonId)
    .single();
  if (!season) throw new Error("Season not found");

  const now = new Date().toISOString();
  const participantId = newId("participant");
  await admin.from("participants").insert({
    id: participantId,
    competition_id: season.competition_id,
    display_name: sanitizeDisplayText(displayName, 100),
    online_client_username: onlineClientUsername
      ? sanitizeDisplayText(onlineClientUsername, 64)
      : null,
    created_at: now,
    updated_at: now,
  });
  await admin.from("memberships").insert({
    id: newId("membership"),
    season_id: seasonId,
    participant_id: participantId,
    customer_account_id: null,
    role: "participant",
    status: "active",
    eligible: true,
    created_at: now,
    updated_at: now,
  });

  revalidatePath("/organizer");
  return participantId;
}

export async function updateParticipantUsernameAction(
  seasonId: string,
  participantId: string,
  onlineClientUsername: string,
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", seasonId)
    .single();
  if (!season) throw new Error("Season not found");

  const username = onlineClientUsername.trim();
  await admin
    .from("participants")
    .update({
      online_client_username: username ? sanitizeDisplayText(username, 64) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", participantId)
    .eq("competition_id", season.competition_id);

  revalidatePath("/organizer");
  revalidatePath("/fixtures");
  revalidatePath("/calendar");
}

export async function updateParticipantPlayerIdAction(
  seasonId: string,
  participantId: string,
  onlineClientPlayerId: string,
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", seasonId)
    .single();
  if (!season) throw new Error("Season not found");

  const playerId = onlineClientPlayerId.trim();
  await admin
    .from("participants")
    .update({
      online_client_player_id: playerId ? sanitizeDisplayText(playerId, 64) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", participantId)
    .eq("competition_id", season.competition_id);

  revalidatePath("/organizer");
  revalidatePath("/fixtures");
  revalidatePath("/calendar");
}

export async function applyParticipantUsernameFromProfileAction(
  seasonId: string,
  participantId: string,
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("customer_account_id")
    .eq("season_id", seasonId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!membership?.customer_account_id) {
    throw new Error("Player is not linked to an account");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("online_client_username, display_name")
    .eq("id", membership.customer_account_id)
    .single();

  const username = profile?.online_client_username?.trim() || profile?.display_name?.trim();
  if (!username) throw new Error("Linked profile has no username set");

  await updateParticipantUsernameAction(seasonId, participantId, username);
}

export async function getOrganizerSeasonsAction() {
  const session = await requireAuth();
  const admin = createAdminClient();

  const select = "id, name, visibility, status, timezone, seasons(id, name, status)";

  if (isEnvOrganizerEmail(session.email)) {
    const { data: all } = await admin
      .from("competitions")
      .select(select)
      .order("created_at", { ascending: false });
    return all ?? [];
  }

  const { data: owned } = await admin
    .from("competitions")
    .select(select)
    .eq("owner_customer_account_id", session.userId);

  return owned ?? [];
}

export async function getSeasonContextAction(seasonId: string) {
  const admin = createAdminClient();
  const seasonRow = await admin.from("seasons").select("*, competitions(*)").eq("id", seasonId).single();
  const competitionId = seasonRow.data?.competition_id ?? "";

  const [ruleset, formatPlan, participants, memberships, fixtures, rounds, invitations] =
    await Promise.all([
      admin.from("rulesets").select("*").eq("season_id", seasonId).single(),
      admin.from("format_plans").select("*").eq("season_id", seasonId).single(),
      admin.from("participants").select("*").eq("competition_id", competitionId),
      admin.from("memberships").select("*").eq("season_id", seasonId),
      admin.from("fixtures").select("*").eq("season_id", seasonId).order("created_at"),
      admin.from("rounds").select("*").eq("season_id", seasonId).order("sequence"),
      admin
        .from("season_invitations")
        .select("id, email, display_name, participant_id, accepted_at, expires_at")
        .eq("season_id", seasonId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString()),
    ]);

  const banListRows = await getSeasonBanListWithPlatformDefaults(seasonId);

  const fixtureIds = (fixtures.data ?? []).map((f) => f.id);
  const { data: matches } = fixtureIds.length
    ? await admin.from("matches").select("fixture_id, outcome").in("fixture_id", fixtureIds)
    : { data: [] };

  const matchesByFixtureId = Object.fromEntries(
    (matches ?? []).map((m) => [m.fixture_id, m.outcome as string | null]),
  );

  return {
    season: seasonRow.data,
    ruleset: ruleset.data,
    formatPlan: formatPlan.data,
    participants: participants.data ?? [],
    memberships: memberships.data ?? [],
    fixtures: fixtures.data ?? [],
    rounds: rounds.data ?? [],
    invitations: invitations.data ?? [],
    banList: banListRows,
    matchesByFixtureId,
  };
}
