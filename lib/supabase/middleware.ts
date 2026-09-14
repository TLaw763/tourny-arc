import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  PATHNAME_HEADER,
  SELECTED_SEASON_COOKIE,
  SELECTED_SEASON_HEADER,
} from "@/lib/selected-season-cookie";
import { pathRequiresSelectedTournament } from "@/lib/tournament-gate";
import { getPublicSupabaseEnv } from "./env-public";

function redirectHome(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const selectedSeason = request.cookies.get(SELECTED_SEASON_COOKIE)?.value;
  const seasonFromQuery = request.nextUrl.searchParams.get("seasonId");
  const seasonFromPath = pathname.match(/^\/seasons\/([^/]+)/)?.[1];
  const resolvedSeason = seasonFromPath ?? seasonFromQuery ?? selectedSeason;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);

  if (pathname === "/") {
    requestHeaders.delete(SELECTED_SEASON_HEADER);
  } else {
    if (resolvedSeason) {
      requestHeaders.set(SELECTED_SEASON_HEADER, resolvedSeason);
    } else if (pathRequiresSelectedTournament(pathname)) {
      return redirectHome(request);
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
  } else if (seasonFromPath || seasonFromQuery) {
    supabaseResponse.cookies.set(
      SELECTED_SEASON_COOKIE,
      seasonFromPath ?? seasonFromQuery!,
      {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      },
    );
  }

  return supabaseResponse;
}
