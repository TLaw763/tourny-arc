import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, email: user.email ?? "" };
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function isOrganizerForSeason(userId: string, seasonId: string) {
  const admin = createAdminClient();
  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", seasonId)
    .single();

  if (!season) return false;

  const { data: competition } = await admin
    .from("competitions")
    .select("owner_customer_account_id")
    .eq("id", season.competition_id)
    .single();

  if (competition?.owner_customer_account_id === userId) return true;

  const { data: membership } = await admin
    .from("memberships")
    .select("role")
    .eq("season_id", seasonId)
    .eq("customer_account_id", userId)
    .eq("role", "organizer")
    .maybeSingle();

  return !!membership;
}

export async function getMembershipForUser(userId: string, seasonId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("*")
    .eq("season_id", seasonId)
    .eq("customer_account_id", userId)
    .maybeSingle();
  return data;
}
