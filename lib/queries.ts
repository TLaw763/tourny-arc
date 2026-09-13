import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPublicScheduleEligible } from "@/lib/domain";
import type { FixtureState, GamePlatform } from "@/lib/domain/types";
import { resolveGamePlatform } from "@/lib/game-platform";
import {
  buildFormByParticipant,
  countSeasonFixturesByParticipant,
  enrichStandingRows,
  type DbStandingRow,
  type EnrichedStandingRow,
  type FormResult,
} from "@/lib/standings-display";

const PUBLIC_COMPETITION_FIELDS_BASE =
  "id, name, description, visibility, timezone, logo_url, cover_image_url";
const PUBLIC_COMPETITION_FIELDS = `${PUBLIC_COMPETITION_FIELDS_BASE}, game_platform`;

const PUBLIC_SEASON_SELECT = (competitionFields: string) =>
  `id, name, status, starts_at, ends_at, competitions!inner(${competitionFields})`;

function missingGamePlatformColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("game_platform"));
}

export async function getPublicSeasons() {
  const supabase = await createClient();
  const select = PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS);
  let { data, error } = await supabase
    .from("seasons")
    .select(select)
    .eq("competitions.visibility", "public")
    .order("created_at", { ascending: false });

  if (missingGamePlatformColumn(error)) {
    ({ data } = await supabase
      .from("seasons")
      .select(PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS_BASE))
      .eq("competitions.visibility", "public")
      .order("created_at", { ascending: false }));
  }

  return data ?? [];
}

export type PublicTournamentCard = {
  seasonId: string;
  seasonName: string;
  seasonStatus: string;
  startsAt: string | null;
  endsAt: string | null;
  competitionId: string;
  competitionName: string;
  description: string | null;
  gamePlatform: GamePlatform | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
};

function competitionRow(value: unknown) {
  if (Array.isArray(value)) return value[0] as Record<string, unknown> | undefined;
  return value as Record<string, unknown> | null | undefined;
}

export function mapPublicTournamentCards(
  seasons: Awaited<ReturnType<typeof getPublicSeasons>>,
): PublicTournamentCard[] {
  return seasons.map((s) => {
    const competition = competitionRow(s.competitions);
    return {
      seasonId: s.id,
      seasonName: s.name,
      seasonStatus: s.status,
      startsAt: s.starts_at as string | null,
      endsAt: s.ends_at as string | null,
      competitionId: (competition?.id as string) ?? "",
      competitionName: (competition?.name as string) ?? "Competition",
      description: (competition?.description as string | null) ?? null,
      gamePlatform: resolveGamePlatform(
        competition?.game_platform as string | null | undefined,
        (competition?.name as string | undefined) ?? null,
      ),
      logoUrl: (competition?.logo_url as string | null) ?? null,
      coverImageUrl: (competition?.cover_image_url as string | null) ?? null,
    };
  });
}

export async function getPublicSeason(seasonId: string) {
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("seasons")
    .select(PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS))
    .eq("id", seasonId)
    .eq("competitions.visibility", "public")
    .maybeSingle();

  if (missingGamePlatformColumn(error)) {
    ({ data } = await supabase
      .from("seasons")
      .select(PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS_BASE))
      .eq("id", seasonId)
      .eq("competitions.visibility", "public")
      .maybeSingle());
  }

  if (!data) return null;
  const cards = mapPublicTournamentCards([data]);
  return cards[0] ?? null;
}

function participantName(value: unknown): string {
  if (Array.isArray(value)) return (value[0] as { display_name?: string } | undefined)?.display_name ?? "TBD";
  return (value as { display_name?: string } | null)?.display_name ?? "TBD";
}

export function mapPublicCalendarFixtures(
  fixtures: Awaited<ReturnType<typeof getPublicCalendarFixtures>>,
) {
  return fixtures.map((f) => {
    const match = Array.isArray(f.matches) ? f.matches[0] : f.matches;
    const round = Array.isArray(f.rounds) ? f.rounds[0] : f.rounds;
    return {
      id: f.id,
      round_id: f.round_id as string | null,
      state: f.state as string,
      confirmed_start_at: f.confirmed_start_at as string | null,
      participant_a_name: participantName(f.participant_a),
      participant_b_name: participantName(f.participant_b),
      match_outcome: (match as { outcome?: string | null } | null)?.outcome ?? null,
      round_label: (round as { label?: string } | null)?.label ?? null,
      round_sequence: (round as { sequence?: number } | null)?.sequence ?? null,
    };
  });
}

const PUBLIC_FIXTURE_SELECT = `
  id, state, confirmed_start_at, season_id, round_id,
  participant_a:participants!fixtures_participant_a_id_fkey(display_name),
  participant_b:participants!fixtures_participant_b_id_fkey(display_name),
  matches(outcome),
  rounds(id, label, sequence),
  seasons(name, competitions(name, timezone))
`;

const PUBLIC_SCHEDULE_STATES = [
  "generated",
  "time_proposed",
  "confirmed",
  "in_progress",
  "result_pending",
  "disputed",
  "finalized",
  "postponed",
] as const;

/** Server-side guard: only load fixtures for public competitions. */
async function isPublicSeason(seasonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, competitions!inner(visibility)")
    .eq("id", seasonId)
    .eq("competitions.visibility", "public")
    .maybeSingle();
  return !!data;
}

export async function getPublicSeasonRounds(seasonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rounds")
    .select("id, label, sequence")
    .eq("season_id", seasonId)
    .order("sequence");
  return data ?? [];
}

/** All public matchups for list view (includes unscheduled generated fixtures). */
export async function getPublicScheduleFixtures(seasonId: string) {
  if (!(await isPublicSeason(seasonId))) return [];

  // Service role: RLS may still hide `generated` fixtures until migration 005 is applied.
  const admin = createAdminClient();
  const { data } = await admin
    .from("fixtures")
    .select(PUBLIC_FIXTURE_SELECT)
    .eq("season_id", seasonId)
    .eq("is_bye", false)
    .in("state", [...PUBLIC_SCHEDULE_STATES])
    .order("created_at");
  return data ?? [];
}

export async function getPublicCalendarFixtures(seasonId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("fixtures")
    .select(PUBLIC_FIXTURE_SELECT)
    .eq("is_bye", false)
    .not("confirmed_start_at", "is", null)
    .in("state", [
      "confirmed",
      "in_progress",
      "result_pending",
      "disputed",
      "finalized",
      "postponed",
    ]);

  if (seasonId) query = query.eq("season_id", seasonId);
  const { data } = await query.order("confirmed_start_at");
  return data ?? [];
}

export async function getPublicFixture(fixtureId: string) {
  const admin = createAdminClient();
  const { data: fixture } = await admin
    .from("fixtures")
    .select(
      `
      *,
      participant_a:participants!fixtures_participant_a_id_fkey(id, display_name, online_client_username),
      participant_b:participants!fixtures_participant_b_id_fkey(id, display_name, online_client_username),
      seasons(name, competitions(name, visibility, timezone)),
      stream_links(url, label, visibility)
    `,
    )
    .eq("id", fixtureId)
    .single();

  if (!fixture) return null;
  const competition = Array.isArray(fixture.seasons)
    ? (fixture.seasons[0] as { competitions?: { visibility?: string } })?.competitions
    : (fixture.seasons as { competitions?: { visibility?: string } | { visibility?: string }[] })
        ?.competitions;
  const visibility = Array.isArray(competition)
    ? competition[0]?.visibility
    : (competition as { visibility?: string } | undefined)?.visibility;
  if (visibility !== "public") return null;
  if (!isPublicScheduleEligible(fixture.state as FixtureState)) return null;

  const { data: match } = await admin
    .from("matches")
    .select("*, games(*)")
    .eq("fixture_id", fixtureId)
    .maybeSingle();

  return { fixture, match };
}

/** Next confirmed fixtures by start time (includes live in-progress). */
export async function getPublicUpcomingFixtures(seasonId: string, limit = 5) {
  if (!(await isPublicSeason(seasonId))) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("fixtures")
    .select(PUBLIC_FIXTURE_SELECT)
    .eq("season_id", seasonId)
    .eq("is_bye", false)
    .not("confirmed_start_at", "is", null)
    .in("state", ["confirmed", "in_progress", "postponed"])
    .order("confirmed_start_at", { ascending: true });

  const now = Date.now();
  return (data ?? [])
    .filter(
      (f) =>
        f.state === "in_progress" ||
        new Date(f.confirmed_start_at as string).getTime() >= now,
    )
    .slice(0, limit);
}

export async function getPublicStandings(seasonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("standings")
    .select("*, participants(display_name)")
    .eq("season_id", seasonId)
    .order("rank");
  return data ?? [];
}

async function getPublicSeasonFormContext(seasonId: string) {
  if (!(await isPublicSeason(seasonId))) {
    return { formByParticipant: new Map<string, FormResult[]>(), seasonTotals: new Map() };
  }

  const admin = createAdminClient();
  const [{ data: finalized }, { data: scheduled }] = await Promise.all([
    admin
      .from("fixtures")
      .select(
        "participant_a_id, participant_b_id, updated_at, confirmed_start_at, matches(outcome)",
      )
      .eq("season_id", seasonId)
      .eq("state", "finalized")
      .eq("is_bye", false),
    admin
      .from("fixtures")
      .select("participant_a_id, participant_b_id")
      .eq("season_id", seasonId)
      .eq("is_bye", false),
  ]);

  return {
    formByParticipant: buildFormByParticipant(finalized ?? []),
    seasonTotals: countSeasonFixturesByParticipant(scheduled ?? []),
  };
}

export async function getPublicStandingsEnriched(seasonId: string): Promise<EnrichedStandingRow[]> {
  const [rows, context] = await Promise.all([
    getPublicStandings(seasonId),
    getPublicSeasonFormContext(seasonId),
  ]);

  return enrichStandingRows(
    rows as DbStandingRow[],
    context.formByParticipant,
    context.seasonTotals,
  );
}

export async function getPublicPlayerProfile(seasonId: string, participantId: string) {
  if (!(await isPublicSeason(seasonId))) return null;

  const admin = createAdminClient();
  const { data: participant } = await admin
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .single();
  if (!participant) return null;

  const [enrichedStandings, context, tournament] = await Promise.all([
    getPublicStandingsEnriched(seasonId),
    getPublicSeasonFormContext(seasonId),
    getPublicSeason(seasonId),
  ]);

  const standing = enrichedStandings.find((s) => s.participant_id === participantId) ?? null;
  const standingIndex = enrichedStandings.findIndex((s) => s.participant_id === participantId);
  const neighborAbove =
    standingIndex > 0 ? (enrichedStandings[standingIndex - 1] ?? null) : null;
  const neighborBelow =
    standingIndex >= 0 && standingIndex < enrichedStandings.length - 1
      ? (enrichedStandings[standingIndex + 1] ?? null)
      : null;

  const now = Date.now();
  const { data: upcomingRaw } = await admin
    .from("fixtures")
    .select(PUBLIC_FIXTURE_SELECT)
    .eq("season_id", seasonId)
    .eq("is_bye", false)
    .not("confirmed_start_at", "is", null)
    .in("state", ["confirmed", "in_progress", "postponed"])
    .or(`participant_a_id.eq.${participantId},participant_b_id.eq.${participantId}`)
    .order("confirmed_start_at", { ascending: true })
    .limit(5);

  const upcoming = mapPublicCalendarFixtures(upcomingRaw ?? [])
    .filter(
      (f) =>
        f.state === "in_progress" ||
        (f.confirmed_start_at && new Date(f.confirmed_start_at).getTime() >= now),
    )
    .slice(0, 3);

  const form = context.formByParticipant.get(participantId) ?? [];
  const seasonTotalMatches =
    context.seasonTotals.get(participantId) ?? standing?.matches_played ?? 0;

  return {
    participant,
    tournament,
    standing,
    neighborAbove,
    neighborBelow,
    form,
    seasonTotalMatches,
    upcoming,
  };
}

/** @deprecated Use getPublicPlayerProfile */
export async function getPublicPlayerOverview(seasonId: string, participantId: string) {
  return getPublicPlayerProfile(seasonId, participantId);
}

export async function getMyFixtures(userId: string, seasonId?: string) {
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("memberships")
    .select("participant_id")
    .eq("customer_account_id", userId)
    .eq("role", "participant");

  const participantIds = [
    ...new Set((memberships ?? []).map((m) => m.participant_id).filter(Boolean)),
  ];
  if (!participantIds.length) return [];

  const participantFilter = participantIds.join(",");
  let query = admin
    .from("fixtures")
    .select(
      `
      *,
      participant_a:participants!fixtures_participant_a_id_fkey(display_name),
      participant_b:participants!fixtures_participant_b_id_fkey(display_name),
      matches(outcome),
      rounds(id, label, sequence)
    `,
    )
    .eq("is_bye", false)
    .or(`participant_a_id.in.(${participantFilter}),participant_b_id.in.(${participantFilter})`);

  if (seasonId) query = query.eq("season_id", seasonId);

  const { data: fixtures } = await query.order("created_at");

  return (fixtures ?? []).sort((a, b) => {
    const roundA = Array.isArray(a.rounds) ? a.rounds[0] : a.rounds;
    const roundB = Array.isArray(b.rounds) ? b.rounds[0] : b.rounds;
    const seqA = (roundA as { sequence?: number } | null)?.sequence ?? Number.MAX_SAFE_INTEGER;
    const seqB = (roundB as { sequence?: number } | null)?.sequence ?? Number.MAX_SAFE_INTEGER;
    if (seqA !== seqB) return seqA - seqB;
    return String(a.created_at).localeCompare(String(b.created_at));
  });
}
