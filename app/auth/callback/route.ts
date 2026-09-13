import { NextResponse } from "next/server";
import { canCreateAccount } from "@/lib/auth-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function displayNameFromGoogle(metadata: Record<string, unknown> | undefined, email?: string) {
  const name =
    (metadata?.full_name as string | undefined) ??
    (metadata?.name as string | undefined) ??
    (metadata?.display_name as string | undefined);
  if (name?.trim()) return name.trim();
  if (email) return email.split("@")[0] ?? "User";
  return "User";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/organizer";
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const description = searchParams.get("error_description") ?? "";
    const params = new URLSearchParams({ error: "auth" });
    if (/database/i.test(description)) {
      params.set("reason", "database");
    }
    return NextResponse.redirect(`${origin}/login?${params}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const params = new URLSearchParams({ error: "auth", reason: "exchange" });
      return NextResponse.redirect(`${origin}/login?${params}`);
    }

    if (data.user) {
      const user = data.user;
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("id, created_at")
        .eq("id", user.id)
        .maybeSingle();

      const profileAgeMs = profile?.created_at
        ? Date.now() - new Date(profile.created_at).getTime()
        : Number.POSITIVE_INFINITY;
      const isFreshAccount = profileAgeMs < 120_000;

      if (isFreshAccount) {
        const allowed = await canCreateAccount(user.email ?? "", next);
        if (!allowed) {
          await admin.from("profiles").delete().eq("id", user.id);
          await supabase.auth.signOut();
          await admin.auth.admin.deleteUser(user.id);
          return NextResponse.redirect(`${origin}/login?error=invite_only`);
        }
      }

      await admin.from("profiles").upsert({
        id: user.id,
        display_name: displayNameFromGoogle(user.user_metadata, user.email),
        email: user.email ?? "",
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
