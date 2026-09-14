import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPublicScheduleEligible } from "@/lib/domain";
import type { BanListCategory, FixtureState, GamePlatform, SeasonBanListEntry } from "@/lib/domain/types";
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

function missingOnlineClientPlayerIdColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.toLowerCase().includes("online_client_player_id"));
}

const PUBLIC_FIXTURE_PARTICIPANT_FIELDS = "id, display_name, online_client_username";

function buildPublicFixtureSelect(includePlayerId: boolean) {
  const participantFields = includePlayerId
    ? `${PUBLIC_FIXTURE_PARTICIPANT_FIELDS}, online_client_player_id`
    : PUBLIC_FIXTURE_PARTICIPANT_FIELDS;
  return `
  id, state, confirmed_start_at, season_id, round_id,
  participant_a:participants!fixtures_participant_a_id_fkey(${participantFields}),
  participant_b:participants!fixtures_participant_b_id_fkey(${participantFields}),
  matches(outcome, points_player_a, points_player_b, games(sequence, outcome)),
  rounds(id, label, sequence),
  seasons(name, competitions(name, timezone))
`;
}

const PUBLIC_FIXTURE_SELECT = buildPublicFixtureSelect(true);
const PUBLIC_FIXTURE_SELECT_BASE = buildPublicFixtureSelect(false);

type FixtureQueryResult = {
  data: unknown[] | null;
  error: { message?: string } | null;
};

async function queryPublicFixtures(
  run: (select: string) => Promise<FixtureQueryResult>,
): Promise<unknown[]> {
  const withPlayerId = await run(PUBLIC_FIXTURE_SELECT);
  if (!withPlayerId.error) return withPlayerId.data ?? [];
  if (missingOnlineClientPlayerIdColumn(withPlayerId.error)) {
    const fallback = await run(PUBLIC_FIXTURE_SELECT_BASE);
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data ?? [];
  }
  throw new Error(withPlayerId.error.message);
}

type PublicSeasonRow = {
  id: string;
  name: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  competitions: unknown;
};

export async function getPublicSeasons(): Promise<PublicSeasonRow[]> {
  const supabase = await createClient();
  const select = PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS);
  const initial = await supabase
    .from("seasons")
    .select(select)
    .eq("competitions.visibility", "public")
    .order("created_at", { ascending: false });

  let data = initial.data;
  if (missingGamePlatformColumn(initial.error)) {
    const fallback = await supabase
      .from("seasons")
      .select(PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS_BASE))
      .eq("competitions.visibility", "public")
      .order("created_at", { ascending: false });
    data = fallback.data;
  }

  return (data ?? []) as unknown as PublicSeasonRow[];
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

export function mapPublicTournamentCards(seasons: PublicSeasonRow[]): PublicTournamentCard[] {
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
  const initial = await supabase
    .from("seasons")
    .select(PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS))
    .eq("id", seasonId)
    .eq("competitions.visibility", "public")
    .maybeSingle();

  let data = initial.data;
  if (missingGamePlatformColumn(initial.error)) {
    const fallback = await supabase
      .from("seasons")
      .select(PUBLIC_SEASON_SELECT(PUBLIC_COMPETITION_FIELDS_BASE))
      .eq("id", seasonId)
      .eq("competitions.visibility", "public")
      .maybeSingle();
    data = fallback.data;
  }

  if (!data) return null;
  const cards = mapPublicTournamentCards([data as unknown as PublicSeasonRow]);
  return cards[0] ?? null;
}

export async function getPublicSeasonBanList(seasonId: string): Promise<SeasonBanListEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("season_ban_list_entries")
    .select("id, season_id, card_name, card_id, category, genesys_points, updated_at")
    .eq("season_id", seasonId)
    .order("card_name");

  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id,
    seasonId: row.season_id,
    cardName: row.card_name,
    cardId: row.card_id ?? null,
    category: row.category as BanListCategory,
    genesysPoints: row.genesys_points ?? null,
    updatedAt: row.updated_at,
  }));
}

type ParticipantRow = {
  id?: string;
  display_name?: string;
  online_client_username?: string | null;
  online_client_player_id?: string | null;
};

function participantRow(value: unknown): {
  id: string;
  display_name: string;
  online_client_username: string | null;
  online_client_player_id: string | null;
} {
  const row = (Array.isArray(value) ? value[0] : value) as ParticipantRow | null | undefined;
  return {
    id: row?.id ?? "",
    display_name: row?.display_name ?? "TBD",
    online_client_username: row?.online_client_username ?? null,
    online_client_player_id: row?.online_client_player_id ?? null,
  };
}

function mapPublicFixtureRow(f: Record<string, unknown>) {
  const match = Array.isArray(f.matches) ? f.matches[0] : f.matches;
  const round = Array.isArray(f.rounds) ? f.rounds[0] : f.rounds;
  const participantA = participantRow(f.participant_a);
  const participantB = participantRow(f.participant_b);
  const matchRow = match as {
    outcome?: string | null;
    games?: Array<{ sequence: number; outcome: string }> | { sequence: number; outcome: string };
  } | null;
  const games = matchRow?.games
    ? Array.isArray(matchRow.games)
      ? matchRow.games
      : [matchRow.games]
    : [];

  return {
    id: f.id as string,
    round_id: f.round_id as string | null,
    state: f.state as string,
    confirmed_start_at: f.confirmed_start_at as string | null,
    participant_a_id: participantA.id,
    participant_a_name: participantA.display_name,
    participant_a_username: participantA.online_client_username,
    participant_a_player_id: participantA.online_client_player_id,
    participant_b_id: participantB.id,
    participant_b_name: participantB.display_name,
    participant_b_username: participantB.online_client_username,
    participant_b_player_id: participantB.online_client_player_id,
    match_outcome: matchRow?.outcome ?? null,
    match_games: games,
    round_label: (round as { label?: string } | null)?.label ?? null,
    round_sequence: (round as { sequence?: number } | null)?.sequence ?? null,
  };
}

export type PublicScheduleFixture = ReturnType<typeof mapPublicFixtureRow>;

export function mapPublicCalendarFixtures(
  fixtures: Awaited<ReturnType<typeof getPublicCalendarFixtures>>,
) {
  return fixtures.map((f) => mapPublicFixtureRow(f as Record<string, unknown>));
}

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
  return queryPublicFixtures(async (select) =>
    admin
      .from("fixtures")
      .select(select)
      .eq("season_id", seasonId)
      .eq("is_bye", false)
      .in("state", [...PUBLIC_SCHEDULE_STATES])
      .order("created_at"),
  );
}

export async function getPublicCalendarFixtures(seasonId?: string) {
  const supabase = await createClient();
  return queryPublicFixtures(async (select) => {
    let query = supabase
      .from("fixtures")
      .select(select)
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
    return query.order("confirmed_start_at");
  });
}

function buildPublicFixtureDetailSelect(includePlayerId: boolean) {
  const participantFields = includePlayerId
    ? `${PUBLIC_FIXTURE_PARTICIPANT_FIELDS}, online_client_player_id`
    : PUBLIC_FIXTURE_PARTICIPANT_FIELDS;
  return `
      *,
      participant_a:participants!fixtures_participant_a_id_fkey(${participantFields}),
      participant_b:participants!fixtures_participant_b_id_fkey(${participantFields}),
      rounds(id, label, sequence),
      seasons(name, competitions(name, visibility, timezone)),
      stream_links(url, label, visibility)
    `;
}

type ParticipantEmbed = {
  id: string;
  display_name: string;
  online_client_username?: string | null;
  online_client_player_id?: string | null;
};

function participantEmbed(value: unknown): ParticipantEmbed | null {
  const row = (Array.isArray(value) ? value[0] : value) as ParticipantEmbed | null | undefined;
  if (!row?.id) return null;
  return row;
}

export type FixtureMatchupPlayerContext = {
  participant: ParticipantEmbed;
  standing: EnrichedStandingRow | null;
  form: FormResult[];
  seasonTotalMatches: number;
};

export type PublicFixtureMatchup = {
  fixture: {
    id: string;
    season_id: string;
    state: string;
    confirmed_start_at: string | null;
  };
  match: {
    outcome?: string | null;
    points_player_a?: number;
    points_player_b?: number;
    games?: Array<{ sequence: number; outcome: string }>;
  } | null;
  tournament: Awaited<ReturnType<typeof getPublicSeason>>;
  roundLabel: string | null;
  playerA: FixtureMatchupPlayerContext;
  playerB: FixtureMatchupPlayerContext;
  streams: Array<{ url: string; label: string | null }>;
};

export async function getPublicFixtureMatchup(fixtureId: string): Promise<PublicFixtureMatchup | null> {
  const base = await getPublicFixture(fixtureId);
  if (!base) return null;

  const { fixture: rawFixture, match } = base;
  const fixtureRecord = rawFixture as Record<string, unknown> & {
    id: string;
    season_id: string;
    state: string;
    confirmed_start_at: string | null;
    participant_a: unknown;
    participant_b: unknown;
    rounds?: unknown;
    stream_links?: unknown;
  };

  const pa = participantEmbed(fixtureRecord.participant_a);
  const pb = participantEmbed(fixtureRecord.participant_b);
  if (!pa || !pb) return null;

  const seasonId = fixtureRecord.season_id;
  const [enrichedStandings, context, tournament] = await Promise.all([
    getPublicStandingsEnriched(seasonId),
    getPublicSeasonFormContext(seasonId),
    getPublicSeason(seasonId),
  ]);

  function buildPlayer(participant: ParticipantEmbed): FixtureMatchupPlayerContext {
    const standing = enrichedStandings.find((s) => s.participant_id === participant.id) ?? null;
    return {
      participant,
      standing,
      form: context.formByParticipant.get(participant.id) ?? [],
      seasonTotalMatches:
        context.seasonTotals.get(participant.id) ?? standing?.matches_played ?? 0,
    };
  }

  const round = Array.isArray(fixtureRecord.rounds)
    ? fixtureRecord.rounds[0]
    : fixtureRecord.rounds;
  const roundLabel = (round as { label?: string } | null)?.label ?? null;

  return {
    fixture: {
      id: fixtureRecord.id,
      season_id: fixtureRecord.season_id,
      state: fixtureRecord.state,
      confirmed_start_at: fixtureRecord.confirmed_start_at,
    },
    match: match
      ? {
          outcome: match.outcome as string | null | undefined,
          points_player_a: match.points_player_a as number | undefined,
          points_player_b: match.points_player_b as number | undefined,
          games: (match.games as Array<{ sequence: number; outcome: string }> | undefined) ?? [],
        }
      : null,
    tournament,
    roundLabel,
    playerA: buildPlayer(pa),
    playerB: buildPlayer(pb),
    streams: (fixtureRecord.stream_links as Array<{ url: string; label: string | null }>) ?? [],
  };
}

export async function getPublicFixture(fixtureId: string) {
  const admin = createAdminClient();
  const withPlayerId = await admin
    .from("fixtures")
    .select(buildPublicFixtureDetailSelect(true))
    .eq("id", fixtureId)
    .single();

  const fixtureResult =
    withPlayerId.error && missingOnlineClientPlayerIdColumn(withPlayerId.error)
      ? await admin
          .from("fixtures")
          .select(buildPublicFixtureDetailSelect(false))
          .eq("id", fixtureId)
          .single()
      : withPlayerId;

  if (fixtureResult.error || !fixtureResult.data) return null;
  const fixture = fixtureResult.data as unknown as Record<string, unknown> & {
    season_id: string;
    state: string;
    confirmed_start_at: string | null;
  };
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
  const data = await queryPublicFixtures(async (select) =>
    admin
      .from("fixtures")
      .select(select)
      .eq("season_id", seasonId)
      .eq("is_bye", false)
      .not("confirmed_start_at", "is", null)
      .in("state", ["confirmed", "in_progress", "postponed"])
      .order("confirmed_start_at", { ascending: true }),
  );

  const now = Date.now();
  return (data as Array<{ state: string; confirmed_start_at: string | null }>)
    .filter(
      (f) =>
        f.state === "in_progress" ||
        (f.confirmed_start_at && new Date(f.confirmed_start_at).getTime() >= now),
    )
    .slice(0, limit);
}

export async function getPublicStandings(seasonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("standings")
    .select("*, participants(display_name, online_client_username)")
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
  const upcomingRaw = await queryPublicFixtures(async (select) =>
    admin
      .from("fixtures")
      .select(select)
      .eq("season_id", seasonId)
      .eq("is_bye", false)
      .not("confirmed_start_at", "is", null)
      .in("state", ["confirmed", "in_progress", "postponed"])
      .or(`participant_a_id.eq.${participantId},participant_b_id.eq.${participantId}`)
      .order("confirmed_start_at", { ascending: true })
      .limit(5),
  );

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
