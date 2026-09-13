export const GMAIL_ONLY_INVITE_MESSAGE =
  "Only Gmail addresses are supported for invites right now.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** @gmail.com only — matches Google sign-in accounts used for launch. */
export function isGmailAddress(email: string) {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return false;
  return normalized.slice(at + 1) === "gmail.com";
}

export function assertGmailAddress(email: string) {
  if (!isGmailAddress(email)) {
    throw new Error(GMAIL_ONLY_INVITE_MESSAGE);
  }
}
