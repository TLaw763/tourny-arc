"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, isOrganizerForSeason } from "@/lib/auth";
import { newId } from "@/lib/db/ids";
import { computeMatchOutcome, normalizePairingRounds, type ScoringGame } from "@/lib/domain";
import { validateEditedRounds, type PairingRound } from "@/lib/domain/pairing";
import {
  findFixtureMeta,
  fixtureHasImportableScore,
  importScoreToGamesForFixture,
} from "@/lib/fixture-import/scores";
import type { FixtureImportMeta } from "@/lib/fixture-import/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { rebuildStandingsAction } from "@/lib/actions/standings";

const INSERT_BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    batches.push(items.slice(offset, offset + size));
  }
  return batches;
}

async function insertInBatches(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  rows: Record<string, unknown>[],
  batchSize = INSERT_BATCH_SIZE,
) {
  for (const batch of chunk(rows, batchSize)) {
    const { error } = await admin.from(table).insert(batch);
    if (error) throw new Error(`Failed to insert ${table}: ${error.message}`);
  }
}

export async function getEligibleRoster(seasonId: string) {
  const admin = createAdminClient();
  const rosterSelectWithPlayerId =
    "participant_id, participants(id, display_name, online_client_username, online_client_player_id)";
  const rosterSelectBase =
    "participant_id, participants(id, display_name, online_client_username)";

  const membershipsResult = await admin
    .from("memberships")
    .select(rosterSelectWithPlayerId)
    .eq("season_id", seasonId)
    .eq("eligible", true)
    .eq("role", "participant");

  const memberships =
    membershipsResult.error?.message?.toLowerCase().includes("online_client_player_id")
      ? (
          await admin
            .from("memberships")
            .select(rosterSelectBase)
            .eq("season_id", seasonId)
            .eq("eligible", true)
            .eq("role", "participant")
        ).data
      : membershipsResult.data;

  return (memberships ?? [])
    .map((row) => {
      const participant = Array.isArray(row.participants) ? row.participants[0] : row.participants;
      if (!participant) return null;
      return {
        id: participant.id as string,
        display_name: participant.display_name as string,
        online_client_username: participant.online_client_username as string | null,
        online_client_player_id:
          ("online_client_player_id" in participant
            ? (participant.online_client_player_id as string | null)
            : null) ?? null,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      display_name: string;
      online_client_username: string | null;
      online_client_player_id: string | null;
    }>;
}

type ScoredImport = {
  matchId: string;
  games: ScoringGame[];
};

async function applyImportedScoresBatch(
  admin: ReturnType<typeof createAdminClient>,
  seasonId: string,
  organizerUserId: string,
  scored: ScoredImport[],
  source: string,
  now: string,
) {
  if (scored.length === 0) return;

  const matchUpdates = scored.map(({ matchId, games }) => {
    const score = computeMatchOutcome(games);
    return {
      id: matchId,
      outcome: score.outcome,
      points_player_a: score.pointsPlayerA,
      points_player_b: score.pointsPlayerB,
      finalization_version: 1,
    };
  });

  for (const batch of chunk(matchUpdates, INSERT_BATCH_SIZE)) {
    const { error } = await admin.from("matches").upsert(batch);
    if (error) throw new Error(`Failed to update match scores: ${error.message}`);
  }

  const matchIds = scored.map((entry) => entry.matchId);
  for (const batch of chunk(matchIds, INSERT_BATCH_SIZE)) {
    const { error } = await admin.from("games").delete().in("match_id", batch);
    if (error) throw new Error(`Failed to clear prior games: ${error.message}`);
  }

  const gameRows: Array<{
    id: string;
    match_id: string;
    sequence: number;
    outcome: string;
  }> = [];

  for (const { matchId, games } of scored) {
    for (const game of games) {
      gameRows.push({
        id: newId("game"),
        match_id: matchId,
        sequence: game.sequence,
        outcome: game.outcome,
      });
    }
  }
  await insertInBatches(admin, "games", gameRows);

  const { data: membership } = await admin
    .from("memberships")
    .select("id")
    .eq("season_id", seasonId)
    .eq("customer_account_id", organizerUserId)
    .maybeSingle();

  if (membership) {
    const submissionRows = scored.map(({ matchId, games }) => ({
      id: newId("result"),
      match_id: matchId,
      submitter_membership_id: membership.id,
      state: "finalized" as const,
      payload: { games, source },
      version: 1,
      created_at: now,
      updated_at: now,
    }));
    await insertInBatches(admin, "result_submissions", submissionRows);
  }
}

export async function commitFixtureImportAction(
  seasonId: string,
  rounds: PairingRound[],
  fixtureMeta: FixtureImportMeta[],
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const admin = createAdminClient();
  const participantIds = (await getEligibleRoster(seasonId)).map((p) => p.id);
  const normalizedRounds = normalizePairingRounds(rounds as unknown[]);
  const validation = validateEditedRounds(normalizedRounds, participantIds);
  if (validation.blockingErrors.length) {
    throw new Error(validation.blockingErrors.map((e) => e.message).join("; "));
  }

  const { data: ruleset } = await admin
    .from("rulesets")
    .select("*")
    .eq("season_id", seasonId)
    .single();
  if (!ruleset) throw new Error("Ruleset not found");

  const now = new Date().toISOString();
  let importedFixtures = 0;
  let importedScores = 0;
  const scoreWarnings: string[] = [];

  const roundRows: Array<{
    id: string;
    season_id: string;
    sequence: number;
    label: string;
    publication_state: string;
    version: number;
    created_at: string;
  }> = [];

  const fixtureRows: Array<{
    id: string;
    round_id: string;
    season_id: string;
    state: string;
    participant_a_id: string;
    participant_b_id: string;
    is_bye: boolean;
    confirmed_start_at: string | null;
    matches_per_fixture: number;
    version: number;
    created_at: string;
    updated_at: string;
  }> = [];

  const matchRows: Array<{
    id: string;
    fixture_id: string;
    sequence: number;
    points_player_a: number;
    points_player_b: number;
    finalization_version: number;
  }> = [];

  const scoredImports: ScoredImport[] = [];

  for (const roundPreview of normalizedRounds) {
    const roundId = newId("round");
    roundRows.push({
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

      const meta = findFixtureMeta(
        fixtureMeta,
        roundPreview.sequence,
        fixturePreview.participantAId,
        fixturePreview.participantBId,
      );

      const hasScore = fixtureHasImportableScore(
        meta,
        fixturePreview.participantAId,
        fixturePreview.participantBId,
      );

      let fixtureState = "generated";
      if (meta?.scheduledAt) fixtureState = "confirmed";
      if (hasScore) fixtureState = "finalized";

      const fixtureId = newId("fixture");
      fixtureRows.push({
        id: fixtureId,
        round_id: roundId,
        season_id: seasonId,
        state: fixtureState,
        participant_a_id: fixturePreview.participantAId,
        participant_b_id: fixturePreview.participantBId,
        is_bye: false,
        confirmed_start_at: meta?.scheduledAt ?? null,
        matches_per_fixture: ruleset.matches_per_fixture,
        version: 1,
        created_at: now,
        updated_at: now,
      });

      let primaryMatchId: string | null = null;
      for (let seq = 1; seq <= ruleset.matches_per_fixture; seq++) {
        const matchId = newId("match");
        if (seq === 1) primaryMatchId = matchId;
        matchRows.push({
          id: matchId,
          fixture_id: fixtureId,
          sequence: seq,
          points_player_a: 0,
          points_player_b: 0,
          finalization_version: 0,
        });
      }

      importedFixtures++;

      if (meta && primaryMatchId) {
        const games = importScoreToGamesForFixture(
          meta,
          fixturePreview.participantAId,
          fixturePreview.participantBId,
        );
        if (games) {
          scoredImports.push({ matchId: primaryMatchId, games });
          importedScores++;
        } else if (meta.scoreA !== null && meta.scoreB !== null) {
          scoreWarnings.push(
            `Round ${roundPreview.sequence}: unsupported score ${meta.scoreA}-${meta.scoreB}`,
          );
        }
      }
    }
  }

  await insertInBatches(admin, "rounds", roundRows);
  await insertInBatches(admin, "fixtures", fixtureRows);
  await insertInBatches(admin, "matches", matchRows);
  await applyImportedScoresBatch(
    admin,
    seasonId,
    session.userId,
    scoredImports,
    "fixture_import",
    now,
  );

  if (importedScores > 0) {
    await rebuildStandingsAction(seasonId);
  }

  revalidatePath("/organizer");
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  revalidatePath("/calendar");
  revalidatePath(`/seasons/${seasonId}/schedule`);

  return {
    importedFixtures,
    importedScores,
    scoreWarnings,
  };
}
