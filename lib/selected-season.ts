import { cookies } from "next/headers";
import { getPublicSeasons } from "@/lib/queries";
import { SELECTED_SEASON_COOKIE } from "@/lib/selected-season-cookie";

export { SELECTED_SEASON_COOKIE };

export async function resolvePublicSeasonId(preferred?: string | null): Promise<string | null> {
  const seasons = await getPublicSeasons();
  if (!seasons.length) return null;

  const validIds = new Set(seasons.map((s) => s.id));

  if (preferred && validIds.has(preferred)) return preferred;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SELECTED_SEASON_COOKIE)?.value;
  if (fromCookie && validIds.has(fromCookie)) return fromCookie;

  return seasons[0]!.id;
}
