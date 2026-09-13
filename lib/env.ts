import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
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

export function getAppUrl(): string {
  if (getEnv().NEXT_PUBLIC_APP_URL) return getEnv().NEXT_PUBLIC_APP_URL!;
  if (process.env.NODE_ENV === "production") {
    return "https://tornament.enigmic.co.za";
  }
  return "http://localhost:3000";
}
