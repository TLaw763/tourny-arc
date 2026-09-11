const TWITCH_HOSTS = new Set(["www.twitch.tv", "twitch.tv", "m.twitch.tv"]);

/** Validate organizer stream URLs — Twitch host allowlist only (SSRF mitigation). */
export function validateStreamUrl(
  url: string,
): { ok: true } | { ok: false; code: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, code: "INVALID_URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, code: "HTTPS_REQUIRED" };
  }

  if (!TWITCH_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, code: "HOST_NOT_ALLOWED" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, code: "CREDENTIALS_NOT_ALLOWED" };
  }

  return { ok: true };
}

/** Strip HTML and bound length for stored user text fields (stored-XSS mitigation). */
export function sanitizeDisplayText(input: string, maxLength: number): string {
  return input
    .replace(/[<>&"']/g, (char) => {
      switch (char) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return char;
      }
    })
    .slice(0, maxLength)
    .trim();
}

/** Reject obviously malicious payloads in free-text fields. */
export function containsSuspiciousMarkup(input: string): boolean {
  return /<script|javascript:|on\w+\s*=|<iframe/i.test(input);
}
