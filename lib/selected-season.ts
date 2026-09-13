import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPublicSeasons } from "@/lib/queries";
import { SELECTED_SEASON_COOKIE } from "@/lib/selected-season-cookie";

export { SELECTED_SEASON_COOKIE };

async function validSeasonIds(): Promise<Set<string>> {
  const seasons = await getPublicSeasons();
  return new Set(seasons.map((s) => s.id));
}

/** Selected tournament from cookie only — no default to first public season. */
export async function getSelectedSeasonId(paramSeasonId?: string | null): Promise<string | null> {
  const validIds = await validSeasonIds();
  if (!validIds.size) return null;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SELECTED_SEASON_COOKIE)?.value;
  if (!fromCookie || !validIds.has(fromCookie)) return null;

  if (paramSeasonId && paramSeasonId !== fromCookie) return null;

  return fromCookie;
}

export async function requireSelectedSeasonId(paramSeasonId?: string | null): Promise<string> {
  const seasonId = await getSelectedSeasonId(paramSeasonId);
  if (!seasonId) redirect("/");
  return seasonId;
}

/** @deprecated Use getSelectedSeasonId — kept for gradual migration if referenced elsewhere. */
export async function resolvePublicSeasonId(preferred?: string | null): Promise<string | null> {
  return getSelectedSeasonId(preferred);
}
