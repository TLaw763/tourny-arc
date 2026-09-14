function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function envOrganizerEmails(): string[] {
  return (process.env.ORGANIZER_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

/** League organizers from env — full organizer board access, not site admin. */
export function isEnvOrganizerEmail(email: string | null | undefined) {
  if (!email) return false;
  return envOrganizerEmails().includes(normalizeEmail(email));
}
