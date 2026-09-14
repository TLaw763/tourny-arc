"use server";

import { requireAuth, isOrganizerForSeason } from "@/lib/auth";
import { commitFixtureImportAction, getEligibleRoster } from "@/lib/actions/fixture-import";
import { fetchMdLeagueFixtures, fetchMdLeaguePlayers } from "@/lib/md-league/client";
import { getMdLeagueImportConfig } from "@/lib/md-league/config";
import { buildMdLeagueImportPreview } from "@/lib/md-league/map-import";
import type { FixtureImportMeta, FixtureImportPreview } from "@/lib/fixture-import/types";
import type { PairingRound } from "@/lib/domain/pairing";

export async function previewMdLeagueImportAction(seasonId: string): Promise<FixtureImportPreview> {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const config = getMdLeagueImportConfig();
  if (!config) {
    throw new Error(
      "Master Duel League import is not configured. Add MD_LEAGUE_SUPABASE_URL and MD_LEAGUE_SUPABASE_ANON_KEY to your environment, or export a CSV with pnpm md-league:export-csv.",
    );
  }

  const roster = await getEligibleRoster(seasonId);
  const [mdPlayers, mdFixtures] = await Promise.all([
    fetchMdLeaguePlayers(config),
    fetchMdLeagueFixtures(config),
  ]);

  return buildMdLeagueImportPreview(roster, mdPlayers, mdFixtures);
}

export async function commitMdLeagueImportAction(
  seasonId: string,
  rounds: PairingRound[],
  fixtureMeta: FixtureImportMeta[],
) {
  if (!getMdLeagueImportConfig()) {
    throw new Error("Master Duel League import is not configured");
  }
  return commitFixtureImportAction(seasonId, rounds, fixtureMeta);
}
