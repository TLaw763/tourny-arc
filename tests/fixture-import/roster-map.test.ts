import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapImportPlayerToParticipantId } from "../../lib/fixture-import/roster-map";

const roster = [
  { id: "p1", display_name: "Kiev", online_client_username: "Saber" },
  { id: "p2", display_name: "Mohsin", online_client_username: "MagicManMo" },
];

describe("import roster matching", () => {
  it("matches display name and username together", () => {
    assert.equal(
      mapImportPlayerToParticipantId({ name: "Kiev", username: "Saber" }, roster),
      "p1",
    );
  });

  it("matches username alone when display name differs", () => {
    assert.equal(
      mapImportPlayerToParticipantId({ name: "Wrong", username: "Saber" }, roster),
      "p1",
    );
  });

  it("matches display name alone when username is missing", () => {
    assert.equal(mapImportPlayerToParticipantId({ name: "Mohsin", username: null }, roster), "p2");
  });

  it("matches MD ID stored on roster player id field", () => {
    const rosterWithIds = [
      ...roster,
      { id: "p3", display_name: "Kiev", online_client_player_id: "088-813-081" },
    ];
    assert.equal(
      mapImportPlayerToParticipantId({ name: "Wrong", username: null, mdId: "088813081" }, rosterWithIds),
      "p3",
    );
  });
});
