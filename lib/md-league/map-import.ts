import type { PairingRound } from "@/lib/domain/pairing";
import {
  formatUnmappedPlayerLabel,
  mapImportPlayerToParticipantId,
  type ImportRosterParticipant,
} from "@/lib/fixture-import/roster-map";
import type { FixtureImportPreview } from "@/lib/fixture-import/types";
import type { MdLeagueFixture, MdLeaguePlayer } from "@/lib/md-league/types";

function mapMdPlayerToParticipantId(
  player: MdLeaguePlayer,
  roster: ImportRosterParticipant[],
): string | null {
  return mapImportPlayerToParticipantId(
    {
      name: player.name,
      username: player.game_name,
      mdId: player.md_id,
    },
    roster,
  );
}

function mdPlayerLabel(player: MdLeaguePlayer): string {
  return formatUnmappedPlayerLabel({
    name: player.name,
    username: player.game_name,
    mdId: player.md_id,
  });
}

function roundLabel(round: number, leg: number | null, firstLegCount: number): string {
  if (leg === 2 || round > firstLegCount) {
    return `Round ${round} (return)`;
  }
  return `Round ${round}`;
}

/** Map md-league rows into tourny pairing rounds + per-fixture metadata (scores, schedule). */
export function buildMdLeagueImportPreview(
  roster: ImportRosterParticipant[],
  mdPlayers: MdLeaguePlayer[],
  mdFixtures: MdLeagueFixture[],
): FixtureImportPreview {
  const warnings: string[] = [];
  const blockingErrors: string[] = [];
  const unmappedPlayers = new Set<string>();

  const playerByMdId = new Map(mdPlayers.map((p) => [p.id, p]));
  const mdToParticipant = new Map<string, string>();

  for (const player of mdPlayers) {
    const participantId = mapMdPlayerToParticipantId(player, roster);
    if (participantId) {
      mdToParticipant.set(player.id, participantId);
    } else {
      unmappedPlayers.add(mdPlayerLabel(player));
    }
  }

  const maxRound = mdFixtures.reduce((max, fixture) => Math.max(max, fixture.round), 0);
  const firstLegCount = Math.ceil(maxRound / 2);

  const byRound = new Map<number, MdLeagueFixture[]>();
  for (const fixture of mdFixtures) {
    const list = byRound.get(fixture.round) ?? [];
    list.push(fixture);
    byRound.set(fixture.round, list);
  }

  const rounds: PairingRound[] = [];
  const fixtureMeta: FixtureImportPreview["fixtureMeta"] = [];
  let scoredFixtureCount = 0;

  for (const roundNumber of [...byRound.keys()].sort((a, b) => a - b)) {
    const fixturesInRound = byRound.get(roundNumber) ?? [];
    const leg = fixturesInRound[0]?.leg ?? null;
    const pairingFixtures: PairingRound["fixtures"] = [];

    for (const fixture of fixturesInRound) {
      const participantAId = mdToParticipant.get(fixture.player_a);
      const participantBId = mdToParticipant.get(fixture.player_b);
      const playerA = playerByMdId.get(fixture.player_a);
      const playerB = playerByMdId.get(fixture.player_b);

      if (!participantAId && playerA) unmappedPlayers.add(mdPlayerLabel(playerA));
      if (!participantBId && playerB) unmappedPlayers.add(mdPlayerLabel(playerB));

      if (!participantAId || !participantBId) {
        blockingErrors.push(
          `Round ${roundNumber}: could not map ${playerA ? mdPlayerLabel(playerA) : fixture.player_a} vs ${playerB ? mdPlayerLabel(playerB) : fixture.player_b}`,
        );
        continue;
      }

      pairingFixtures.push({
        participantAId,
        participantBId,
        isBye: false,
      });

      const hasScore = fixture.score_a !== null && fixture.score_b !== null;
      if (hasScore) scoredFixtureCount++;

      fixtureMeta.push({
        roundSequence: roundNumber,
        participantAId,
        participantBId,
        scoreA: fixture.score_a,
        scoreB: fixture.score_b,
        scheduledAt: fixture.scheduled_at,
        decidedAt: fixture.decided_at,
      });
    }

    if (pairingFixtures.length > 0) {
      rounds.push({
        sequence: roundNumber,
        label: roundLabel(roundNumber, leg, firstLegCount),
        fixtures: pairingFixtures,
      });
    }
  }

  if (unmappedPlayers.size > 0) {
    blockingErrors.push(
      `Add these roster players (match by name and/or username) before importing: ${[...unmappedPlayers].sort().join("; ")}`,
    );
  }

  if (rounds.length === 0 && blockingErrors.length === 0) {
    blockingErrors.push("No fixtures found in Master Duel League");
  }

  return {
    rounds,
    fixtureMeta,
    warnings,
    blockingErrors,
    unmappedPlayers: [...unmappedPlayers].sort(),
    sourceFixtureCount: mdFixtures.length,
    scoredFixtureCount,
  };
}
