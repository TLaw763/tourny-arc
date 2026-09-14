import { resolveAppUrl } from "@/lib/branding";
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? resolveAppUrl(value) : undefined))
    .pipe(z.string().url().optional()),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Allow build to complete without real Supabase credentials
    if (process.env.NEXT_PHASE === "phase-production-build") {
      cached = {
        NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-key",
      };
      return cached;
    }
    throw new Error(
      `Missing or invalid environment variables: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }
  cached = parsed.data;
  return cached;
}

function normalizeLocalAppUrl(url: string): string {
  if (process.env.NODE_ENV === "production") return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.protocol = "http:";
      return parsed.origin;
    }
  } catch {
    // fall through
  }
  return url;
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return normalizeLocalAppUrl(resolveAppUrl());
  }
  if (process.env.NODE_ENV === "production") {
    return "https://tornament.enigmic.co.za";
  }
  return "http://localhost:3000";
}
