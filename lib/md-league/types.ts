export type MdLeaguePlayer = {
  id: string;
  name: string;
  game_name: string | null;
  md_id: string | null;
};

export type MdLeagueFixture = {
  id: string;
  round: number;
  leg: number | null;
  player_a: string;
  player_b: string;
  score_a: number | null;
  score_b: number | null;
  scheduled_at: string | null;
  scheduled_note: string | null;
  decided_at: string | null;
};

export type {
  FixtureImportMeta as MdLeagueImportFixtureMeta,
  FixtureImportPreview as MdLeagueImportPreview,
} from "@/lib/fixture-import/types";
