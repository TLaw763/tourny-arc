import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPhasesFromTemplate,
  describeFormatPlan,
  leagueModeFromFormatPlan,
} from "../../lib/domain/format-plan";

describe("format plan wizard", () => {
  it("builds league phases", () => {
    const phases = buildPhasesFromTemplate({
      template: "league",
      leagueMode: "double_round_robin",
    });
    assert.equal(phases.length, 1);
    assert.equal(phases[0]!.kind, "league");
    assert.equal(phases[0]!.leagueMode, "double_round_robin");
  });

  it("builds hybrid swiss cut phases", () => {
    const phases = buildPhasesFromTemplate({
      template: "hybrid_swiss_cut",
      swissRounds: 9,
      cutSize: 8,
    });
    assert.equal(phases.length, 2);
    assert.equal(phases[0]!.kind, "swiss");
    assert.equal(phases[0]!.swissRounds, 9);
    assert.equal(phases[1]!.kind, "bracket");
    assert.equal(phases[1]!.bracketSize, 8);
  });

  it("notes non-power-of-two cut in hybrid preview", () => {
    const phases = buildPhasesFromTemplate({
      template: "hybrid_swiss_cut",
      cutSize: 6,
    });
    const preview = describeFormatPlan("hybrid_swiss_cut", phases);
    assert.ok(preview.notes.some((n) => n.includes("power of 2")));
  });

  it("describes league preview with participant count", () => {
    const phases = buildPhasesFromTemplate({ template: "league" });
    const preview = describeFormatPlan("league", phases, 4);
    assert.equal(preview.phases[0]!.automationStatus, "available");
    assert.match(preview.phases[0]!.summary, /3 rounds/);
  });

  it("marks swiss as planned automation", () => {
    const phases = buildPhasesFromTemplate({ template: "swiss", swissRounds: 5 });
    const preview = describeFormatPlan("swiss", phases);
    assert.equal(preview.phases[0]!.automationStatus, "planned");
  });

  it("extracts league mode for fixture generation", () => {
    const phases = buildPhasesFromTemplate({
      template: "league",
      leagueMode: "double_round_robin",
    });
    assert.equal(leagueModeFromFormatPlan(phases), "double_round_robin");
  });

  it("builds manual league phase", () => {
    const phases = buildPhasesFromTemplate({
      template: "league",
      leagueMode: "manual",
    });
    assert.equal(phases[0]!.leagueMode, "manual");
    const preview = describeFormatPlan("league", phases);
    assert.match(preview.phases[0]!.summary, /importing/i);
    assert.equal(leagueModeFromFormatPlan(phases), "manual");
  });
});
