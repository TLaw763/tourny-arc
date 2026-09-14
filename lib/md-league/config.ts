export type MdLeagueImportConfig = {
  supabaseUrl: string;
  anonKey: string;
};

/** Optional credentials for importing from md-league.vercel.app (Master Duel League). */
export function getMdLeagueImportConfig(): MdLeagueImportConfig | null {
  const supabaseUrl = process.env.MD_LEAGUE_SUPABASE_URL?.trim();
  const anonKey = process.env.MD_LEAGUE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return null;
  return { supabaseUrl, anonKey };
}

export function isMdLeagueImportConfigured(): boolean {
  return getMdLeagueImportConfig() !== null;
}
