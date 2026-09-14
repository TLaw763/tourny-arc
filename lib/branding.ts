export const APP_NAME = "Tornament Enigmic";
export const APP_SLUG = "tornament-enigmic";
export const APP_DOMAIN = "tornament.enigmic.co.za";
export const APP_URL = `https://${APP_DOMAIN}`;
export const APP_DESCRIPTION = "League and tournament management for Enigmic";

/** Accepts bare hostnames (Vercel env) or full URLs. */
export function resolveAppUrl(raw = process.env.NEXT_PUBLIC_APP_URL): string {
  const value = raw?.trim() || APP_URL;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}
