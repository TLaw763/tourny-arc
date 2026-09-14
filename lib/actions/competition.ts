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
  UpdateTournamentDetailsInput,
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

export async function updateTournamentDetailsAction(
  seasonId: string,
  input: UpdateTournamentDetailsInput,
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const competitionName = sanitizeDisplayText(input.competitionName.trim(), 200);
  const seasonName = sanitizeDisplayText(input.seasonName.trim(), 200);
  const timezone = sanitizeDisplayText(input.timezone.trim(), 64);
  if (!competitionName) throw new Error("Competition name is required");
  if (!seasonName) throw new Error("Season name is required");
  if (!timezone) throw new Error("Timezone is required");

  const startsAt = input.startsAt?.trim() || null;
  const endsAt = input.endsAt?.trim() || null;
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    throw new Error("Season start must be before end");
  }

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", seasonId)
    .single();
  if (!season) throw new Error("Season not found");

  const now = new Date().toISOString();
  const competitionUpdate = {
    name: competitionName,
    description: input.description?.trim()
      ? sanitizeDisplayText(input.description.trim(), 2000)
      : null,
    visibility: input.visibility,
    timezone,
    logo_url: input.logoUrl?.trim() || null,
    cover_image_url: input.coverImageUrl?.trim() || null,
    status: input.competitionStatus,
    updated_at: now,
    game_platform: input.gamePlatform ?? null,
  };

  let { error: competitionError } = await admin
    .from("competitions")
    .update(competitionUpdate)
    .eq("id", season.competition_id);

  if (competitionError?.message?.toLowerCase().includes("game_platform")) {
    const { game_platform: omittedPlatform, ...withoutPlatform } = competitionUpdate;
    void omittedPlatform;
    ({ error: competitionError } = await admin
      .from("competitions")
      .update(withoutPlatform)
      .eq("id", season.competition_id));
  }
  if (competitionError) throw new Error(competitionError.message);

  const { error: seasonError } = await admin
    .from("seasons")
    .update({
      name: seasonName,
      status: input.seasonStatus,
      starts_at: startsAt,
      ends_at: endsAt,
      updated_at: now,
    })
    .eq("id", seasonId);
  if (seasonError) throw new Error(seasonError.message);

  if (input.gamePlatform && isGamePlatform(input.gamePlatform)) {
    const { data: existingBanList } = await admin
      .from("season_ban_list_entries")
      .select("id")
      .eq("season_id", seasonId)
      .limit(1);

    if (!existingBanList?.length) {
      try {
        await applyReferenceBanlistToSeason(admin, seasonId, input.gamePlatform);
      } catch {
        // Reference tables may not be synced yet.
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/organizer");
  revalidatePath("/calendar");
  revalidatePath("/standings");
  revalidatePath(`/seasons/${seasonId}`);
  revalidatePath(`/seasons/${seasonId}/ban-list`);
  revalidatePath(`/seasons/${seasonId}/schedule`);
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

async function assertOrganizerAccess(seasonId: string) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }
  return session;
}

/** Lightweight access check for a single selected season (avoids loading all competitions). */
export async function verifyOrganizerSeasonAccessAction(seasonId: string) {
  const session = await requireAuth();
  const allowed = await isOrganizerForSeason(session.userId, seasonId);
  if (!allowed) {
    return { allowed: false as const };
  }

  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("id, name, competitions(name)")
    .eq("id", seasonId)
    .single();

  if (!season) {
    return { allowed: false as const };
  }

  const competition = Array.isArray(season.competitions)
    ? season.competitions[0]
    : season.competitions;
  const seasonLabel = competition?.name
    ? `${competition.name} — ${season.name}`
    : season.name;

  return { allowed: true as const, seasonLabel };
}

const ORGANIZER_FIXTURE_COLUMNS =
  "id, season_id, round_id, participant_a_id, participant_b_id, state, confirmed_start_at, is_bye, created_at";

/** Fast path: tournament shell, roster, rules — no fixtures or ban list. */
export async function getOrganizerSeasonCoreAction(seasonId: string) {
  await assertOrganizerAccess(seasonId);
  const admin = createAdminClient();
  const seasonRow = await admin.from("seasons").select("*, competitions(*)").eq("id", seasonId).single();
  const competitionId = seasonRow.data?.competition_id ?? "";

  const [ruleset, formatPlan, participants, memberships, invitations] = await Promise.all([
    admin.from("rulesets").select("*").eq("season_id", seasonId).single(),
    admin.from("format_plans").select("*").eq("season_id", seasonId).single(),
    admin.from("participants").select("*").eq("competition_id", competitionId),
    admin.from("memberships").select("*").eq("season_id", seasonId),
    admin
      .from("season_invitations")
      .select("id, email, display_name, participant_id, accepted_at, expires_at")
      .eq("season_id", seasonId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);

  return {
    season: seasonRow.data,
    ruleset: ruleset.data,
    formatPlan: formatPlan.data,
    participants: participants.data ?? [],
    memberships: memberships.data ?? [],
    invitations: invitations.data ?? [],
  };
}

/** Deferred path: fixtures, rounds, and match outcomes for the organizer board. */
export async function getOrganizerSeasonFixturesAction(seasonId: string) {
  await assertOrganizerAccess(seasonId);
  const admin = createAdminClient();

  const [fixtures, rounds, matchesResult] = await Promise.all([
    admin
      .from("fixtures")
      .select(ORGANIZER_FIXTURE_COLUMNS)
      .eq("season_id", seasonId)
      .order("created_at"),
    admin.from("rounds").select("id, season_id, label, sequence").eq("season_id", seasonId).order("sequence"),
    admin
      .from("matches")
      .select("fixture_id, outcome, fixtures!inner(season_id)")
      .eq("fixtures.season_id", seasonId),
  ]);

  const matchesByFixtureId = Object.fromEntries(
    (matchesResult.data ?? []).map((m) => [m.fixture_id, m.outcome as string | null]),
  );

  return {
    fixtures: fixtures.data ?? [],
    rounds: rounds.data ?? [],
    matchesByFixtureId,
  };
}

/** Deferred path: season ban list (may seed from platform reference on first load). */
export async function getOrganizerSeasonBanListAction(seasonId: string) {
  await assertOrganizerAccess(seasonId);
  const banList = await getSeasonBanListWithPlatformDefaults(seasonId);
  return { banList };
}

export async function getSeasonContextAction(seasonId: string) {
  const [core, fixtures, banList] = await Promise.all([
    getOrganizerSeasonCoreAction(seasonId),
    getOrganizerSeasonFixturesAction(seasonId),
    getOrganizerSeasonBanListAction(seasonId),
  ]);
  return { ...core, ...fixtures, ...banList };
}
