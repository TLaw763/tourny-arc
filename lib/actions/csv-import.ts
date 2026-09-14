"use server";

import { requireAuth, isOrganizerForSeason } from "@/lib/auth";
import { commitFixtureImportAction, getEligibleRoster } from "@/lib/actions/fixture-import";
import { buildFixtureImportPreviewFromCsv } from "@/lib/fixture-import/csv";
import type { FixtureImportPreview } from "@/lib/fixture-import/types";
import type { PairingRound } from "@/lib/domain/pairing";
import type { FixtureImportMeta } from "@/lib/fixture-import/types";

export async function previewCsvImportAction(
  seasonId: string,
  csvText: string,
): Promise<FixtureImportPreview> {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const roster = await getEligibleRoster(seasonId);
  return buildFixtureImportPreviewFromCsv(roster, csvText);
}

export async function commitCsvImportAction(
  seasonId: string,
  rounds: PairingRound[],
  fixtureMeta: FixtureImportMeta[],
) {
  return commitFixtureImportAction(seasonId, rounds, fixtureMeta);
}
