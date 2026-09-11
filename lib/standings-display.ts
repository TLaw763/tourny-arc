export type FormResult = "W" | "D" | "L";

export type FinalizedFixtureForForm = {
  participant_a_id: string;
  participant_b_id: string;
  updated_at: string;
  confirmed_start_at: string | null;
  matches: { outcome?: string | null } | { outcome?: string | null }[] | null;
};

export function matchOutcomeForParticipant(
  outcome: string,
  participantId: string,
  participantAId: string,
  participantBId: string,
): FormResult | null {
  if (outcome === "draw") return "D";
  if (outcome === "playerAWin" || outcome === "forfeitB") {
    return participantId === participantAId ? "W" : "L";
  }
  if (outcome === "playerBWin" || outcome === "forfeitA") {
    return participantId === participantBId ? "W" : "L";
  }
  return null;
}

function fixtureSortTime(fixture: FinalizedFixtureForForm) {
  return new Date(fixture.confirmed_start_at ?? fixture.updated_at).getTime();
}

/** Last 5 results per participant, oldest → newest (left → right). */
export function buildFormByParticipant(
  fixtures: FinalizedFixtureForForm[],
  limit = 5,
): Map<string, FormResult[]> {
  const sorted = [...fixtures].sort((a, b) => fixtureSortTime(b) - fixtureSortTime(a));
  const recentByParticipant = new Map<string, FormResult[]>();

  for (const fixture of sorted) {
    const match = Array.isArray(fixture.matches) ? fixture.matches[0] : fixture.matches;
    const outcome = match?.outcome;
    if (!outcome) continue;

    for (const participantId of [fixture.participant_a_id, fixture.participant_b_id]) {
      const result = matchOutcomeForParticipant(
        outcome,
        participantId,
        fixture.participant_a_id,
        fixture.participant_b_id,
      );
      if (!result) continue;

      const bucket = recentByParticipant.get(participantId) ?? [];
      if (bucket.length >= limit) continue;
      bucket.push(result);
      recentByParticipant.set(participantId, bucket);
    }
  }

  const formByParticipant = new Map<string, FormResult[]>();
  for (const [participantId, results] of recentByParticipant) {
    formByParticipant.set(participantId, [...results].reverse());
  }
  return formByParticipant;
}

export function countSeasonFixturesByParticipant(
  fixtures: Array<{ participant_a_id: string; participant_b_id: string }>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const fixture of fixtures) {
    totals.set(fixture.participant_a_id, (totals.get(fixture.participant_a_id) ?? 0) + 1);
    totals.set(fixture.participant_b_id, (totals.get(fixture.participant_b_id) ?? 0) + 1);
  }
  return totals;
}

export type DbStandingRow = {
  participant_id: string;
  rank: number;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  games_won: number;
  games_lost: number;
  match_points: number;
  participants: { display_name: string } | null;
};

export type EnrichedStandingRow = DbStandingRow & {
  game_difference: number;
  form: FormResult[];
  seasonTotalMatches: number;
};

export function enrichStandingRows(
  rows: DbStandingRow[],
  formByParticipant: Map<string, FormResult[]>,
  seasonTotals: Map<string, number>,
): EnrichedStandingRow[] {
  return rows.map((row) => ({
    ...row,
    game_difference: row.games_won - row.games_lost,
    form: formByParticipant.get(row.participant_id) ?? [],
    seasonTotalMatches: seasonTotals.get(row.participant_id) ?? row.matches_played,
  }));
}
