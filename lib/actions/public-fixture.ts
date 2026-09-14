"use server";

import { getPublicFixtureMatchup, type PublicFixtureMatchup } from "@/lib/queries";

export async function refreshPublicFixtureMatchupAction(
  fixtureId: string,
): Promise<PublicFixtureMatchup | null> {
  return getPublicFixtureMatchup(fixtureId);
}
