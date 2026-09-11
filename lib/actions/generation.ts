"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isOrganizerForSeason } from "@/lib/auth";
import { newId } from "@/lib/db/ids";
import {
  buildGenerationPreview,
  normalizePairingRounds,
  verifyPreviewToken,
  type ManualPairingInput,
} from "@/lib/domain";
import type { ScheduleGenerationMode } from "@/lib/domain/types";

async function getEligibleParticipantIds(seasonId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("memberships")
    .select("participant_id")
    .eq("season_id", seasonId)
    .eq("eligible", true)
    .eq("role", "participant");
  return (memberships ?? []).map((m) => m.participant_id);
}

export async function previewGenerationAction(
  seasonId: string,
  mode: ScheduleGenerationMode,
  manualPairings?: ManualPairingInput[],
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const participantIds = await getEligibleParticipantIds(seasonId);
  const preview = buildGenerationPreview({ mode, participantIds, manualPairings });

  if (preview.blockingErrors.length === 0 && preview.rounds.length > 0) {
    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await admin.from("generation_previews").upsert({
      preview_token: preview.previewToken,
      season_id: seasonId,
      mode,
      rounds: preview.rounds,
      expires_at: expiresAt,
    });
  }

  return preview;
}

export async function commitGenerationAction(
  seasonId: string,
  previewToken: string,
  idempotencyKey: string,
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("idempotency_keys")
    .select("round_ids")
    .eq("key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    const { data: rounds } = await admin
      .from("rounds")
      .select("*")
      .in("id", existing.round_ids as string[]);
    return { rounds: rounds ?? [], replay: true };
  }

  const { data: cached } = await admin
    .from("generation_previews")
    .select("*")
    .eq("preview_token", previewToken)
    .eq("season_id", seasonId)
    .single();

  if (!cached || new Date(cached.expires_at) < new Date()) {
    throw new Error("Invalid or expired preview token");
  }

  const mode = cached.mode as ScheduleGenerationMode;
  const rounds = normalizePairingRounds(cached.rounds as unknown[]);
  if (!verifyPreviewToken(previewToken, { rounds, mode })) {
    throw new Error("Preview token mismatch");
  }

  const { data: ruleset } = await admin
    .from("rulesets")
    .select("*")
    .eq("season_id", seasonId)
    .single();
  if (!ruleset) throw new Error("Ruleset not found");

  const now = new Date().toISOString();
  const roundIds: string[] = [];

  for (const roundPreview of rounds) {
    const roundId = newId("round");
    roundIds.push(roundId);
    await admin.from("rounds").insert({
      id: roundId,
      season_id: seasonId,
      sequence: roundPreview.sequence,
      label: roundPreview.label,
      publication_state: "published",
      version: 1,
      created_at: now,
    });

    for (const fixturePreview of roundPreview.fixtures) {
      if (fixturePreview.isBye) continue;
      const fixtureId = newId("fixture");
      await admin.from("fixtures").insert({
        id: fixtureId,
        round_id: roundId,
        season_id: seasonId,
        state: "generated",
        participant_a_id: fixturePreview.participantAId,
        participant_b_id: fixturePreview.participantBId,
        is_bye: false,
        matches_per_fixture: ruleset.matches_per_fixture,
        version: 1,
        created_at: now,
        updated_at: now,
      });
      for (let seq = 1; seq <= ruleset.matches_per_fixture; seq++) {
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
  }

  await admin.from("idempotency_keys").insert({
    key: idempotencyKey,
    season_id: seasonId,
    round_ids: roundIds,
    committed_at: now,
  });

  await admin.from("generation_previews").delete().eq("preview_token", previewToken);

  const { data: createdRounds } = await admin.from("rounds").select("*").in("id", roundIds);

  revalidatePath("/organizer");
  return { rounds: createdRounds ?? [], replay: false };
}
