import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  PATHNAME_HEADER,
  SELECTED_SEASON_COOKIE,
  SELECTED_SEASON_HEADER,
} from "@/lib/selected-season-cookie";
import { pathRequiresSelectedTournament } from "@/lib/tournament-gate";
import { getPublicSupabaseEnv } from "./env-public";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const selectedSeason = request.cookies.get(SELECTED_SEASON_COOKIE)?.value;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);

  if (pathname === "/") {
    requestHeaders.delete(SELECTED_SEASON_HEADER);
  } else {
    const seasonFromPath = pathname.match(/^\/seasons\/([^/]+)/)?.[1];
    if (seasonFromPath) {
      requestHeaders.set(SELECTED_SEASON_HEADER, seasonFromPath);
    } else if (pathRequiresSelectedTournament(pathname) && !selectedSeason) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  const { url, anonKey } = getPublicSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  if (pathname === "/") {
    supabaseResponse.cookies.set(SELECTED_SEASON_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
  } else {
    const seasonFromPath = pathname.match(/^\/seasons\/([^/]+)/)?.[1];
    if (seasonFromPath) {
      supabaseResponse.cookies.set(SELECTED_SEASON_COOKIE, seasonFromPath, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return supabaseResponse;
}
