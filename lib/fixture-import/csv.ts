import type { PairingRound } from "@/lib/domain/pairing";
import {
  formatUnmappedPlayerLabel,
  mapImportPlayerToParticipantId,
  type ImportRosterParticipant,
} from "@/lib/fixture-import/roster-map";
import type { FixtureImportPreview } from "@/lib/fixture-import/types";
import type { MdLeagueFixture, MdLeaguePlayer } from "@/lib/md-league/types";

export const FIXTURE_CSV_HEADERS = [
  "round",
  "round_label",
  "player_a",
  "player_a_username",
  "player_b",
  "player_b_username",
  "player_a_md_id",
  "player_b_md_id",
  "score_a",
  "score_b",
  "scheduled_at",
  "decided_at",
] as const;

export type CsvFixtureRow = {
  round: number;
  roundLabel: string;
  playerA: string;
  playerAUsername: string | null;
  playerAMdId: string | null;
  playerB: string;
  playerBUsername: string | null;
  playerBMdId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  scheduledAt: string | null;
  decidedAt: string | null;
};

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Parse RFC 4180-style CSV (handles quoted fields). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      if (char === "\r") i++;
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function headerIndex(headers: string[], name: string): number {
  const normalized = name.trim().toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === normalized);
}

/** Early export omitted player_b — columns after player_a_username were shifted by one. */
function isLegacyShiftedExport(headers: string[]): boolean {
  return headerIndex(headers, "player_b") < 0 && headerIndex(headers, "player_b_username") >= 0;
}

type ColumnLayout = {
  roundIdx: number;
  labelIdx: number;
  playerAIdx: number;
  playerAUsernameIdx: number;
  playerBIdx: number;
  playerBUsernameIdx: number;
  playerAMdIdIdx: number;
  playerBMdIdIdx: number;
  scoreAIdx: number;
  scoreBIdx: number;
  scheduledIdx: number;
  decidedIdx: number;
};

function resolveColumnLayout(headers: string[], hasHeader: boolean): ColumnLayout {
  if (!hasHeader) {
    return {
      roundIdx: 0,
      labelIdx: -1,
      playerAIdx: 1,
      playerAUsernameIdx: -1,
      playerBIdx: 2,
      playerBUsernameIdx: -1,
      playerAMdIdIdx: -1,
      playerBMdIdIdx: -1,
      scoreAIdx: 3,
      scoreBIdx: 4,
      scheduledIdx: 5,
      decidedIdx: 6,
    };
  }

  if (isLegacyShiftedExport(headers)) {
    return {
      roundIdx: headerIndex(headers, "round"),
      labelIdx: headerIndex(headers, "round_label"),
      playerAIdx: headerIndex(headers, "player_a"),
      playerAUsernameIdx: Math.max(
        headerIndex(headers, "player_a_username"),
        headerIndex(headers, "player_a_game_name"),
      ),
      playerBIdx: headerIndex(headers, "player_b_username"),
      playerBUsernameIdx: headerIndex(headers, "player_a_md_id"),
      playerAMdIdIdx: headerIndex(headers, "player_b_md_id"),
      playerBMdIdIdx: headerIndex(headers, "score_a"),
      scoreAIdx: headerIndex(headers, "score_b"),
      scoreBIdx: headerIndex(headers, "scheduled_at"),
      scheduledIdx: headerIndex(headers, "decided_at"),
      decidedIdx: -1,
    };
  }

  return {
    roundIdx: headerIndex(headers, "round"),
    labelIdx: headerIndex(headers, "round_label"),
    playerAIdx: headerIndex(headers, "player_a"),
    playerAUsernameIdx: Math.max(
      headerIndex(headers, "player_a_username"),
      headerIndex(headers, "player_a_game_name"),
    ),
    playerBIdx: headerIndex(headers, "player_b"),
    playerBUsernameIdx: Math.max(
      headerIndex(headers, "player_b_username"),
      headerIndex(headers, "player_b_game_name"),
    ),
    playerAMdIdIdx: Math.max(
      headerIndex(headers, "player_a_md_id"),
      headerIndex(headers, "player_a_id"),
    ),
    playerBMdIdIdx: Math.max(
      headerIndex(headers, "player_b_md_id"),
      headerIndex(headers, "player_b_id"),
    ),
    scoreAIdx: headerIndex(headers, "score_a"),
    scoreBIdx: headerIndex(headers, "score_b"),
    scheduledIdx: headerIndex(headers, "scheduled_at"),
    decidedIdx: headerIndex(headers, "decided_at"),
  };
}

export function parseFixtureCsvRows(text: string): CsvFixtureRow[] {
  const grid = parseCsv(text.trim());
  if (grid.length === 0) return [];

  const headers = grid[0]!.map((h) => h.trim().toLowerCase());
  const hasHeader = headerIndex(headers, "round") >= 0 && headerIndex(headers, "player_a") >= 0;
  const startRow = hasHeader ? 1 : 0;

  const {
    roundIdx,
    labelIdx,
    playerAIdx,
    playerAUsernameIdx,
    playerBIdx,
    playerBUsernameIdx,
    playerAMdIdIdx,
    playerBMdIdIdx,
    scoreAIdx,
    scoreBIdx,
    scheduledIdx,
    decidedIdx,
  } = resolveColumnLayout(headers, hasHeader);

  const rows: CsvFixtureRow[] = [];

  for (let i = startRow; i < grid.length; i++) {
    const cells = grid[i]!;
    const round = parseOptionalInt(cells[roundIdx] ?? "");
    const playerA = (cells[playerAIdx] ?? "").trim();
    const playerB = (cells[playerBIdx] ?? "").trim();
    if (round === null || !playerA || !playerB) continue;

    rows.push({
      round,
      roundLabel:
        labelIdx >= 0 && cells[labelIdx]?.trim()
          ? cells[labelIdx]!.trim()
          : `Round ${round}`,
      playerA,
      playerAUsername:
        playerAUsernameIdx >= 0 && cells[playerAUsernameIdx]?.trim()
          ? cells[playerAUsernameIdx]!.trim()
          : null,
      playerAMdId:
        playerAMdIdIdx >= 0 && cells[playerAMdIdIdx]?.trim() ? cells[playerAMdIdIdx]!.trim() : null,
      playerB,
      playerBUsername:
        playerBUsernameIdx >= 0 && cells[playerBUsernameIdx]?.trim()
          ? cells[playerBUsernameIdx]!.trim()
          : null,
      playerBMdId:
        playerBMdIdIdx >= 0 && cells[playerBMdIdIdx]?.trim() ? cells[playerBMdIdIdx]!.trim() : null,
      scoreA: scoreAIdx >= 0 ? parseOptionalInt(cells[scoreAIdx] ?? "") : null,
      scoreB: scoreBIdx >= 0 ? parseOptionalInt(cells[scoreBIdx] ?? "") : null,
      scheduledAt:
        scheduledIdx >= 0 && cells[scheduledIdx]?.trim() ? cells[scheduledIdx]!.trim() : null,
      decidedAt: decidedIdx >= 0 && cells[decidedIdx]?.trim() ? cells[decidedIdx]!.trim() : null,
    });
  }

  return rows;
}

export function buildFixtureImportPreviewFromCsv(
  roster: ImportRosterParticipant[],
  csvText: string,
): FixtureImportPreview {
  const warnings: string[] = [];
  const blockingErrors: string[] = [];
  const unmappedPlayers = new Set<string>();
  const csvRows = parseFixtureCsvRows(csvText);

  if (csvRows.length === 0) {
    blockingErrors.push("CSV has no fixture rows");
    return {
      rounds: [],
      fixtureMeta: [],
      warnings,
      blockingErrors,
      unmappedPlayers: [],
      sourceFixtureCount: 0,
      scoredFixtureCount: 0,
    };
  }

  const byRound = new Map<number, CsvFixtureRow[]>();
  for (const row of csvRows) {
    const list = byRound.get(row.round) ?? [];
    list.push(row);
    byRound.set(row.round, list);
  }

  const rounds: PairingRound[] = [];
  const fixtureMeta: FixtureImportPreview["fixtureMeta"] = [];
  let scoredFixtureCount = 0;

  for (const roundNumber of [...byRound.keys()].sort((a, b) => a - b)) {
    const rowsInRound = byRound.get(roundNumber) ?? [];
    const pairingFixtures: PairingRound["fixtures"] = [];

    for (const row of rowsInRound) {
      const playerA = {
        name: row.playerA,
        username: row.playerAUsername,
        mdId: row.playerAMdId,
      };
      const playerB = {
        name: row.playerB,
        username: row.playerBUsername,
        mdId: row.playerBMdId,
      };

      const participantAId = mapImportPlayerToParticipantId(playerA, roster);
      const participantBId = mapImportPlayerToParticipantId(playerB, roster);

      if (!participantAId) unmappedPlayers.add(formatUnmappedPlayerLabel(playerA));
      if (!participantBId) unmappedPlayers.add(formatUnmappedPlayerLabel(playerB));

      if (!participantAId || !participantBId) {
        blockingErrors.push(
          `Round ${roundNumber}: could not map ${formatUnmappedPlayerLabel(playerA)} vs ${formatUnmappedPlayerLabel(playerB)}`,
        );
        continue;
      }

      pairingFixtures.push({
        participantAId,
        participantBId,
        isBye: false,
      });

      const hasScore = row.scoreA !== null && row.scoreB !== null;
      if (hasScore) scoredFixtureCount++;

      fixtureMeta.push({
        roundSequence: roundNumber,
        participantAId,
        participantBId,
        scoreA: row.scoreA,
        scoreB: row.scoreB,
        scheduledAt: row.scheduledAt,
        decidedAt: row.decidedAt,
      });
    }

    if (pairingFixtures.length > 0) {
      rounds.push({
        sequence: roundNumber,
        label: rowsInRound[0]?.roundLabel ?? `Round ${roundNumber}`,
        fixtures: pairingFixtures,
      });
    }
  }

  if (unmappedPlayers.size > 0) {
    blockingErrors.push(
      `Add these roster players (match by name and/or username) before importing: ${[...unmappedPlayers].sort().join("; ")}`,
    );
  }

  return {
    rounds,
    fixtureMeta,
    warnings,
    blockingErrors,
    unmappedPlayers: [...unmappedPlayers].sort(),
    sourceFixtureCount: csvRows.length,
    scoredFixtureCount,
  };
}

export function mdLeagueFixturesToCsv(
  players: MdLeaguePlayer[],
  fixtures: MdLeagueFixture[],
): string {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const maxRound = fixtures.reduce((max, f) => Math.max(max, f.round), 0);
  const firstLegCount = Math.ceil(maxRound / 2);

  const lines = [FIXTURE_CSV_HEADERS.join(",")];

  for (const fixture of fixtures) {
    const playerA = playerById.get(fixture.player_a);
    const playerB = playerById.get(fixture.player_b);
    const roundLabel =
      fixture.leg === 2 || fixture.round > firstLegCount
        ? `Round ${fixture.round} (return)`
        : `Round ${fixture.round}`;

    lines.push(
      [
        String(fixture.round),
        escapeCsvField(roundLabel),
        escapeCsvField(playerA?.name ?? fixture.player_a),
        escapeCsvField(playerA?.game_name ?? ""),
        escapeCsvField(playerB?.name ?? fixture.player_b),
        escapeCsvField(playerB?.game_name ?? ""),
        escapeCsvField(playerA?.md_id ?? ""),
        escapeCsvField(playerB?.md_id ?? ""),
        fixture.score_a === null ? "" : String(fixture.score_a),
        fixture.score_b === null ? "" : String(fixture.score_b),
        fixture.scheduled_at ?? "",
        fixture.decided_at ?? "",
      ].join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function fixtureImportPreviewToCsv(
  preview: FixtureImportPreview,
  roster: ImportRosterParticipant[],
): string {
  const rosterById = new Map(roster.map((p) => [p.id, p]));
  const lines = [FIXTURE_CSV_HEADERS.join(",")];

  for (const meta of preview.fixtureMeta) {
    const round = preview.rounds.find((r) => r.sequence === meta.roundSequence);
    const playerA = rosterById.get(meta.participantAId);
    const playerB = rosterById.get(meta.participantBId);
    lines.push(
      [
        String(meta.roundSequence),
        escapeCsvField(round?.label ?? `Round ${meta.roundSequence}`),
        escapeCsvField(playerA?.display_name ?? meta.participantAId),
        escapeCsvField(playerA?.online_client_username ?? ""),
        escapeCsvField(playerB?.display_name ?? meta.participantBId),
        escapeCsvField(playerB?.online_client_username ?? ""),
        "",
        "",
        meta.scoreA === null ? "" : String(meta.scoreA),
        meta.scoreB === null ? "" : String(meta.scoreB),
        meta.scheduledAt ?? "",
        meta.decidedAt ?? "",
      ].join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}
