import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SELECTED_SEASON_COOKIE } from "@/lib/selected-season-cookie";
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

  const seasonPathMatch = request.nextUrl.pathname.match(/^\/seasons\/([^/]+)/);
  const seasonFromPath = seasonPathMatch?.[1];
  const seasonFromQuery =
    request.nextUrl.pathname === "/standings"
      ? request.nextUrl.searchParams.get("seasonId")
      : null;
  const seasonId = seasonFromPath ?? seasonFromQuery;
  if (seasonId) {
    supabaseResponse.cookies.set(SELECTED_SEASON_COOKIE, seasonId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return supabaseResponse;
}
