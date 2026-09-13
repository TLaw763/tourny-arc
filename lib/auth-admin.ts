import { ACCESS_CONTACT_EMAIL } from "@/lib/constants";
import { requireAuth } from "@/lib/auth";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Sole site admin — manages YGOProDeck reference banlists. */
export function isSiteAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const admins = (process.env.SITE_ADMIN_EMAILS ?? ACCESS_CONTACT_EMAIL)
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
  return admins.includes(normalizeEmail(email));
}

export async function requireSiteAdmin() {
  const session = await requireAuth();
  if (!isSiteAdminEmail(session.email)) {
    throw new Error("Forbidden");
  }
  return session;
}
