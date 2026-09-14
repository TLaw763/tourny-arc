import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFixtureImportPreviewFromCsv,
  parseCsv,
  parseFixtureCsvRows,
} from "../../lib/fixture-import/csv";

describe("fixture CSV", () => {
  it("parses quoted fields", () => {
    const rows = parseCsv('round,player_a,player_b\n1,"Alice, Jr",Bob');
    assert.equal(rows[1]![1], "Alice, Jr");
  });

  it("parses fixture rows with header", () => {
    const csv = `round,round_label,player_a,player_b,score_a,score_b,scheduled_at,decided_at
1,Round 1,Alice,Bob,2,0,,
2,Round 2 (return),Bob,Alice,1,2,,`;

    const rows = parseFixtureCsvRows(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.playerA, "Alice");
    assert.equal(rows[1]!.scoreB, 2);
  });

  it("maps CSV names to roster participants", () => {
    const csv = `round,round_label,player_a,player_b,score_a,score_b,scheduled_at,decided_at
1,Round 1,Alice,Bob,2,0,,`;

    const preview = buildFixtureImportPreviewFromCsv(
      [
        { id: "p1", display_name: "Alice" },
        { id: "p2", display_name: "Bob" },
      ],
      csv,
    );

    assert.equal(preview.blockingErrors.length, 0);
    assert.equal(preview.rounds.length, 1);
    assert.equal(preview.fixtureMeta[0]!.scoreA, 2);
    assert.equal(preview.scoredFixtureCount, 1);
  });

  it("maps CSV rows by roster name and username", () => {
    const csv = `round,round_label,player_a,player_a_username,player_b,player_b_username,player_a_md_id,player_b_md_id,score_a,score_b,scheduled_at,decided_at
1,Round 1,Kiev,Saber,Mohsin,MagicManMo,,,2,1,,`;

    const preview = buildFixtureImportPreviewFromCsv(
      [
        { id: "p1", display_name: "Kiev", online_client_username: "Saber" },
        { id: "p2", display_name: "Mohsin", online_client_username: "MagicManMo" },
      ],
      csv,
    );

    assert.equal(preview.blockingErrors.length, 0);
    assert.equal(preview.fixtureMeta[0]!.participantAId, "p1");
    assert.equal(preview.fixtureMeta[0]!.participantBId, "p2");
  });

  it("parses legacy export CSV missing player_b column", () => {
    const csv = `round,round_label,player_a,player_a_username,player_b_username,player_a_md_id,player_b_md_id,score_a,score_b,scheduled_at,decided_at
1,Round 1,Leo,GankTank,Dylan,Glen Powell,718-729-415,770-431-683,2,0,,2026-09-10T13:38:57.775+00:00`;

    const rows = parseFixtureCsvRows(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.playerA, "Leo");
    assert.equal(rows[0]!.playerAUsername, "GankTank");
    assert.equal(rows[0]!.playerB, "Dylan");
    assert.equal(rows[0]!.playerBUsername, "Glen Powell");
    assert.equal(rows[0]!.scoreA, 2);
  });

  it("reports unmapped roster names", () => {
    const csv = `round,round_label,player_a,player_b,score_a,score_b,scheduled_at,decided_at
1,Round 1,Unknown,Bob,,,,`;

    const preview = buildFixtureImportPreviewFromCsv([{ id: "p2", display_name: "Bob" }], csv);

    assert.ok(preview.blockingErrors.some((e) => e.includes("Unknown")));
  });
});
