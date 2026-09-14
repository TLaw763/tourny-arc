#!/usr/bin/env tsx
/**
 * Export fixtures + results from Master Duel League to CSV.
 *
 * Uses the same public Supabase API as https://md-league.vercel.app/fixtures
 * (more reliable than scraping rendered HTML).
 *
 * Usage:
 *   MD_LEAGUE_SUPABASE_URL=... MD_LEAGUE_SUPABASE_ANON_KEY=... pnpm md-league:export-csv
 *   pnpm md-league:export-csv ./exports/md-league-fixtures.csv
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { mdLeagueFixturesToCsv } from "../lib/fixture-import/csv";
import { fetchMdLeagueFixtures, fetchMdLeaguePlayers } from "../lib/md-league/client";
import { getMdLeagueImportConfig } from "../lib/md-league/config";

const config = getMdLeagueImportConfig();
if (!config) {
  console.error(
    "Missing MD_LEAGUE_SUPABASE_URL and MD_LEAGUE_SUPABASE_ANON_KEY.\n" +
      "Copy them from the MD League Supabase project (Settings → API), or add to .env.local and run:\n" +
      "  set -a && source .env.local && set +a && pnpm md-league:export-csv",
  );
  process.exit(1);
}

const outputPath = resolve(process.argv[2] ?? "md-league-fixtures.csv");

const [players, fixtures] = await Promise.all([
  fetchMdLeaguePlayers(config),
  fetchMdLeagueFixtures(config),
]);

const csv = mdLeagueFixturesToCsv(players, fixtures);
writeFileSync(outputPath, csv, "utf8");

console.log(`Wrote ${fixtures.length} fixtures (${players.length} players) to ${outputPath}`);
