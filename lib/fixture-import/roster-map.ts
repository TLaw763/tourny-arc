export type ImportRosterParticipant = {
  id: string;
  display_name: string;
  online_client_username?: string | null;
  online_client_player_id?: string | null;
};

export type ImportPlayerLookup = {
  /** Roster display name (CSV: player_a). */
  name: string;
  /** In-game / client username (CSV: player_a_game_name or player_a_username). */
  username?: string | null;
  /** Master Duel copy ID — optional fallback when stored in username. */
  mdId?: string | null;
};

/** @deprecated Use username */
export type ImportPlayerLookupLegacy = ImportPlayerLookup & {
  gameName?: string | null;
};

export function normalizeParticipantName(value: string): string {
  return value.trim().toLowerCase();
}

/** Normalize Master Duel IDs for comparison (e.g. 088-813-081 → 088813081). */
export function normalizeMdId(value: string): string {
  return value.replace(/[\s-]/g, "").toLowerCase();
}

function usernameMatches(
  rosterUsername: string | null | undefined,
  csvUsername: string,
): boolean {
  if (!rosterUsername?.trim()) return false;
  return normalizeParticipantName(rosterUsername) === normalizeParticipantName(csvUsername);
}

function mdIdMatches(candidate: string | null | undefined, mdId: string): boolean {
  if (!candidate?.trim()) return false;
  return normalizeMdId(candidate) === normalizeMdId(mdId);
}

function resolveUsername(player: ImportPlayerLookup): string | null {
  const username = player.username?.trim() || (player as ImportPlayerLookupLegacy).gameName?.trim();
  return username || null;
}

export function mapNameToParticipantId(
  name: string,
  roster: ImportRosterParticipant[],
): string | null {
  return mapImportPlayerToParticipantId({ name }, roster);
}

/** Match import row to roster display name and/or username. */
export function mapImportPlayerToParticipantId(
  player: ImportPlayerLookup,
  roster: ImportRosterParticipant[],
): string | null {
  const name = player.name.trim();
  const username = resolveUsername(player);
  const normalizedName = name ? normalizeParticipantName(name) : "";

  if (name && username) {
    const byBoth = roster.find(
      (p) =>
        normalizeParticipantName(p.display_name) === normalizedName &&
        usernameMatches(p.online_client_username, username),
    );
    if (byBoth) return byBoth.id;
  }

  if (username) {
    const byUsername = roster.find((p) => usernameMatches(p.online_client_username, username));
    if (byUsername) return byUsername.id;
  }

  if (name) {
    const byName = roster.find((p) => normalizeParticipantName(p.display_name) === normalizedName);
    if (byName) return byName.id;
  }

  const mdId = player.mdId?.trim();
  if (mdId) {
    const byMdId = roster.find(
      (p) =>
        mdIdMatches(p.online_client_player_id, mdId) ||
        mdIdMatches(p.online_client_username, mdId) ||
        mdIdMatches(p.display_name, mdId),
    );
    if (byMdId) return byMdId.id;
  }

  return null;
}

export function formatUnmappedPlayerLabel(player: ImportPlayerLookup): string {
  const parts: string[] = [];
  if (player.name.trim()) parts.push(player.name.trim());
  const username = resolveUsername(player);
  if (username) parts.push(`username ${username}`);
  if (player.mdId?.trim()) parts.push(`MD ID ${player.mdId.trim()}`);
  return parts.join(" · ") || "Unknown";
}
