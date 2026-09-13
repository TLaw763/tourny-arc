import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SELECTED_SEASON_COOKIE } from "@/lib/selected-season-cookie";
import { pathRequiresSelectedTournament } from "@/lib/tournament-gate";
import { getPublicSupabaseEnv } from "./env-public";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getPublicSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const selectedSeason = request.cookies.get(SELECTED_SEASON_COOKIE)?.value;

  if (pathname === "/") {
    supabaseResponse.cookies.set(SELECTED_SEASON_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
  } else {
    const seasonPathMatch = pathname.match(/^\/seasons\/([^/]+)/);
    const seasonFromPath = seasonPathMatch?.[1];
    if (seasonFromPath) {
      supabaseResponse.cookies.set(SELECTED_SEASON_COOKIE, seasonFromPath, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    } else if (pathRequiresSelectedTournament(pathname) && !selectedSeason) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}
