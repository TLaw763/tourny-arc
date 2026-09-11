import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESS_CONTACT_EMAIL } from "@/lib/constants";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAllowlistedEmails(): Set<string> {
  const fromEnv = process.env.ALLOWED_SIGNUP_EMAILS ?? "";
  const emails = fromEnv
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  emails.push(normalizeEmail(ACCESS_CONTACT_EMAIL));
  return new Set(emails);
}

export function isEmailAllowlisted(email: string) {
  return getAllowlistedEmails().has(normalizeEmail(email));
}

export async function hasPendingInvitation(email: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("season_invitations")
    .select("id")
    .eq("email", normalizeEmail(email))
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  return (data?.length ?? 0) > 0;
}

function inviteTokenFromNext(next: string | null) {
  if (!next) return null;
  try {
    const url = new URL(next, "http://localhost");
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

export async function isInviteTokenValidForEmail(token: string, email: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("season_invitations")
    .select("email, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.accepted_at) return false;
  if (new Date(data.expires_at) < new Date()) return false;
  return normalizeEmail(data.email) === normalizeEmail(email);
}

/** New accounts: allowlisted email, pending invite, or valid invite token in `next`. */
export async function canCreateAccount(email: string, next: string | null) {
  if (!email) return false;
  if (isEmailAllowlisted(email)) return true;
  if (await hasPendingInvitation(email)) return true;
  const token = inviteTokenFromNext(next);
  if (token && (await isInviteTokenValidForEmail(token, email))) return true;
  return false;
}
