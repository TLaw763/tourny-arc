import type { MdLeagueFixture, MdLeaguePlayer } from "@/lib/md-league/types";
import type { MdLeagueImportConfig } from "@/lib/md-league/config";

async function mdLeagueFetch<T>(config: MdLeagueImportConfig, path: string): Promise<T> {
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`;
  const response = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Master Duel League API error (${response.status}): ${body.slice(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchMdLeaguePlayers(config: MdLeagueImportConfig): Promise<MdLeaguePlayer[]> {
  return mdLeagueFetch<MdLeaguePlayer[]>(config, "players?select=id,name,game_name,md_id&order=name.asc");
}

export async function fetchMdLeagueFixtures(config: MdLeagueImportConfig): Promise<MdLeagueFixture[]> {
  return mdLeagueFetch<MdLeagueFixture[]>(
    config,
    "fixtures?select=id,round,leg,player_a,player_b,score_a,score_b,scheduled_at,scheduled_note,decided_at&order=round.asc,created_at.asc",
  );
}
