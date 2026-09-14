import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPublicSeasons } from "@/lib/queries";
import {
  PATHNAME_HEADER,
  SELECTED_SEASON_COOKIE,
  SELECTED_SEASON_HEADER,
} from "@/lib/selected-season-cookie";

export { PATHNAME_HEADER, SELECTED_SEASON_COOKIE, SELECTED_SEASON_HEADER };

async function validSeasonIds(): Promise<Set<string>> {
  const seasons = await getPublicSeasons();
  return new Set(seasons.map((s) => s.id));
}

function resolveCandidate(
  validIds: Set<string>,
  fromHeader: string | null,
  fromCookie: string | undefined,
): string | null {
  if (fromHeader && validIds.has(fromHeader)) return fromHeader;
  if (fromCookie && validIds.has(fromCookie)) return fromCookie;
  return null;
}

/** Selected tournament from middleware header (same request) or cookie (later requests). */
export async function getSelectedSeasonId(paramSeasonId?: string | null): Promise<string | null> {
  const headerStore = await headers();
  if (headerStore.get(PATHNAME_HEADER) === "/") return null;

  const validIds = await validSeasonIds();
  if (!validIds.size) return null;

  const cookieStore = await cookies();
  const candidate = resolveCandidate(
    validIds,
    headerStore.get(SELECTED_SEASON_HEADER),
    cookieStore.get(SELECTED_SEASON_COOKIE)?.value,
  );

  if (!candidate) return null;
  if (paramSeasonId && paramSeasonId !== candidate) return null;

  return candidate;
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
