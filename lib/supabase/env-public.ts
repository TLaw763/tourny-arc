/** Public Supabase env — read at runtime (use `pnpm dev` locally, rebuild before `pnpm start`). */
export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. " +
        "Use `pnpm dev` for local work, or rebuild after updating env: rm -rf .next && pnpm build",
    );
  }

  return { url, anonKey };
}
