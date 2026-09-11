"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RoundCollapsibleSection } from "@/components/round-collapsible-section";
import { groupFixturesByRound } from "@/lib/fixture-display";
import { FixtureSchedulePicker } from "@/components/fixture-schedule-picker";
import { FixtureStateBadge } from "@/components/fixture-state-badge";
import { ManualFixtureBuilder } from "@/components/manual-fixture-builder";
import { ParticipantUsernameField } from "@/components/participant-username-field";
import { RosterPlayerRow } from "@/components/roster-player-row";
import { ResultEntry } from "@/components/result-entry";
import {
  addParticipantAction,
  applyParticipantUsernameFromProfileAction,
  getOrganizerSeasonsAction,
  getSeasonContextAction,
  updateParticipantUsernameAction,
} from "@/lib/actions/competition";
import { commitGenerationAction, previewGenerationAction } from "@/lib/actions/generation";
import {
  addStreamLinkAction,
  cancelFixtureAction,
  confirmScheduleAction,
  postponeFixtureAction,
} from "@/lib/actions/fixtures";
import { inviteParticipantAction } from "@/lib/actions/invitations";
import { correctResultAction, finalizeResultAction, submitResultAction } from "@/lib/actions/results";
import { rebuildStandingsAction } from "@/lib/actions/standings";
import type { ManualPairingInput } from "@/lib/domain/pairing";
import type { ScheduleGenerationMode } from "@/lib/domain/types";

type SeasonContext = Awaited<ReturnType<typeof getSeasonContextAction>>;

export default function OrganizerPage() {
  const searchParams = useSearchParams();
  const seasonIdParam = searchParams.get("seasonId");

  const [seasons, setSeasons] = useState<
    Array<{ id: string; name: string; seasons: Array<{ id: string; name: string }> }>
  >([]);
  const [seasonId, setSeasonId] = useState(seasonIdParam ?? "");
  const [ctx, setCtx] = useState<SeasonContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [genMode, setGenMode] = useState<ScheduleGenerationMode>("single_round_robin");
  const [manualPairings, setManualPairings] = useState<ManualPairingInput[]>([]);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [roundPreview, setRoundPreview] = useState<string>("");

  const [newPlayer, setNewPlayer] = useState("");
  const [newPlayerUsername, setNewPlayerUsername] = useState("");

  function participantLabel(p: {
    display_name: string;
    online_client_username?: string | null;
  }) {
    return p.online_client_username
      ? `${p.display_name} (@${p.online_client_username})`
      : p.display_name;
  }

  function linkedAccountId(participantId: string) {
    return (
      ctx?.memberships?.find((m) => m.participant_id === participantId)?.customer_account_id ??
      null
    );
  }

  const load = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    try {
      const data = await getSeasonContextAction(sid);
      setCtx(data);
      const mode = (data.ruleset?.schedule_generation_mode as ScheduleGenerationMode) ?? "single_round_robin";
      setGenMode(mode);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getOrganizerSeasonsAction().then((data) => {
      setSeasons(data as typeof seasons);
      const firstSeason = seasonIdParam ?? data[0]?.seasons?.[0]?.id ?? "";
      if (firstSeason) {
        setSeasonId(firstSeason);
        load(firstSeason);
      } else {
        setLoading(false);
      }
    });
  }, [seasonIdParam, load]);

  const eligibleParticipants = (ctx?.participants ?? []).filter((p) =>
    ctx?.memberships?.some(
      (m) => m.participant_id === p.id && m.eligible && m.role === "participant",
    ),
  );

  async function handleAddPlayer() {
    if (!seasonId || !newPlayer.trim()) return;
    await addParticipantAction(
      seasonId,
      newPlayer.trim(),
      newPlayerUsername.trim() || undefined,
    );
    setNewPlayer("");
    setNewPlayerUsername("");
    await load(seasonId);
    setMessage("Player added");
  }

  async function handleInvitePlayer(participantId: string, email: string, displayName: string) {
    if (!seasonId) throw new Error("No season selected");
    const { acceptUrl } = await inviteParticipantAction(
      seasonId,
      email,
      displayName,
      participantId,
    );
    await load(seasonId);
    return acceptUrl;
  }

  function pendingInviteEmail(participantId: string, displayName: string) {
    const byParticipant = ctx?.invitations?.find((inv) => inv.participant_id === participantId);
    if (byParticipant) return byParticipant.email;
    return (
      ctx?.invitations?.find(
        (inv) => inv.display_name.toLowerCase() === displayName.toLowerCase(),
      )?.email ?? null
    );
  }

  async function handlePreviewGeneration() {
    if (!seasonId) return;
    const preview = await previewGenerationAction(
      seasonId,
      genMode,
      genMode === "manual" ? manualPairings : undefined,
    );
    if (preview.blockingErrors.length) {
      setMessage(preview.blockingErrors.map((e) => e.message).join("; "));
      return;
    }
    setPreviewToken(preview.previewToken);
    setRoundPreview(
      preview.rounds
        .map(
          (r) =>
            `${r.label}: ${r.fixtures.filter((f) => !f.isBye).length} fixtures`,
        )
        .join("\n"),
    );
    setMessage(`Preview: ${preview.rounds.length} rounds${preview.warnings.length ? " (with warnings)" : ""}`);
  }

  async function handleCommitGeneration() {
    if (!seasonId || !previewToken) return;
    const key = crypto.randomUUID();
    await commitGenerationAction(seasonId, previewToken, key);
    setPreviewToken(null);
    setRoundPreview("");
    await load(seasonId);
    setMessage("Fixtures generated");
  }

  async function handleRebuildStandings() {
    if (!seasonId) return;
    await rebuildStandingsAction(seasonId);
    setMessage("Standings rebuilt");
  }

  const fixtureGroups = useMemo(() => {
    if (!ctx) return [];
    return groupFixturesByRound(ctx.rounds ?? [], ctx.fixtures ?? []);
  }, [ctx]);

  if (loading && !ctx) {
    return <p>Loading…</p>;
  }

  if (!seasons.length) {
    return (
      <div className="panel space-y-4 p-6">
        <h1 className="text-2xl font-bold">Organizer board</h1>
        <p>No competitions yet.</p>
        <Link href="/organizer/create" className="btn-primary inline-block no-underline">
          Create your first competition
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Organizer board</h1>
        <Link href="/organizer/create" className="btn-primary no-underline">
          New competition
        </Link>
      </div>

      <select
        className="field-select max-w-md"
        value={seasonId}
        onChange={(e) => {
          setSeasonId(e.target.value);
          load(e.target.value);
        }}
      >
        {seasons.flatMap((c) =>
          (c.seasons ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {c.name} — {s.name}
            </option>
          )),
        )}
      </select>

      {message && (
        <p className="rounded-md bg-[var(--color-accent-soft)] p-3 text-sm">{message}</p>
      )}

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">Roster ({eligibleParticipants.length} eligible)</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="field-input min-w-[10rem] flex-1"
            placeholder="Player name"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
          />
          <input
            className="field-input max-w-[10rem]"
            placeholder="Username (optional)"
            value={newPlayerUsername}
            onChange={(e) => setNewPlayerUsername(e.target.value)}
          />
          <button type="button" className="btn-secondary" onClick={handleAddPlayer}>
            Add
          </button>
        </div>
        <div className="space-y-2">
          {eligibleParticipants.map((p) => (
            <RosterPlayerRow
              key={p.id}
              participantId={p.id}
              displayName={p.display_name}
              username={p.online_client_username}
              linkedAccountId={linkedAccountId(p.id)}
              pendingInviteEmail={pendingInviteEmail(p.id, p.display_name)}
              onSaveUsername={async (participantId, username) => {
                await updateParticipantUsernameAction(seasonId, participantId, username);
                await load(seasonId);
              }}
              onApplyFromProfile={async (participantId) => {
                await applyParticipantUsernameFromProfileAction(seasonId, participantId);
                await load(seasonId);
              }}
              onInvite={handleInvitePlayer}
            />
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">Generate fixtures</h2>
        <select
          className="field-select max-w-xs"
          value={genMode}
          onChange={(e) => setGenMode(e.target.value as ScheduleGenerationMode)}
        >
          <option value="single_round_robin">Single round-robin</option>
          <option value="double_round_robin">Double round-robin</option>
          <option value="manual">Manual</option>
        </select>
        {genMode === "manual" && (
          <ManualFixtureBuilder
            participants={eligibleParticipants}
            onChange={setManualPairings}
          />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={handlePreviewGeneration}>
            Preview
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCommitGeneration}
            disabled={!previewToken}
          >
            Commit generation
          </button>
        </div>
        {roundPreview && (
          <pre className="panel-subtle overflow-x-auto p-3 text-xs">{roundPreview}</pre>
        )}
        <button type="button" className="btn-secondary" onClick={handleRebuildStandings}>
          Rebuild standings
        </button>
      </section>

      <section className="panel space-y-6 p-4">
        <h2 className="font-semibold">Fixtures ({ctx?.fixtures?.filter((f) => !f.is_bye).length ?? 0})</h2>
        {fixtureGroups.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No fixtures yet — generate a schedule above.</p>
        )}
        {fixtureGroups.map(({ round, fixtures: roundFixtures }, roundIndex) => {
          const scheduledCount = roundFixtures.filter((f) => f.confirmed_start_at).length;
          return (
          <RoundCollapsibleSection
            key={round.id}
            roundLabel={round.label}
            fixtureCount={roundFixtures.length}
            scheduledCount={scheduledCount}
            defaultOpen={roundIndex === 0}
          >
              {roundFixtures.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No matchups in this round yet.
                </p>
              ) : (
              roundFixtures.map((fixture) => {
            const pa = ctx?.participants?.find((p) => p.id === fixture.participant_a_id);
            const pb = ctx?.participants?.find((p) => p.id === fixture.participant_b_id);
            return (
              <div key={fixture.id} className="panel-subtle space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/fixtures/${fixture.id}`} className="font-medium">
                    {pa ? participantLabel(pa) : "TBD"} vs {pb ? participantLabel(pb) : "TBD"}
                  </Link>
                  <FixtureStateBadge
                    state={fixture.state}
                    confirmedStartAt={fixture.confirmed_start_at}
                    matchOutcome={ctx?.matchesByFixtureId?.[fixture.id]}
                    participantAName={pa?.display_name}
                    participantBName={pb?.display_name}
                  />
                </div>
                {fixture.confirmed_start_at && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {new Date(fixture.confirmed_start_at).toLocaleString()}
                  </p>
                )}
                {(pa || pb) && (
                  <div className="space-y-1 border-t border-[var(--color-border)] pt-2">
                    {pa && (
                      <ParticipantUsernameField
                        participantId={pa.id}
                        displayName={pa.display_name}
                        username={pa.online_client_username}
                        linkedAccountId={linkedAccountId(pa.id)}
                        onSave={async (participantId, username) => {
                          await updateParticipantUsernameAction(seasonId, participantId, username);
                          await load(seasonId);
                        }}
                        onApplyFromProfile={async (participantId) => {
                          await applyParticipantUsernameFromProfileAction(seasonId, participantId);
                          await load(seasonId);
                        }}
                      />
                    )}
                    {pb && (
                      <ParticipantUsernameField
                        participantId={pb.id}
                        displayName={pb.display_name}
                        username={pb.online_client_username}
                        linkedAccountId={linkedAccountId(pb.id)}
                        onSave={async (participantId, username) => {
                          await updateParticipantUsernameAction(seasonId, participantId, username);
                          await load(seasonId);
                        }}
                        onApplyFromProfile={async (participantId) => {
                          await applyParticipantUsernameFromProfileAction(seasonId, participantId);
                          await load(seasonId);
                        }}
                      />
                    )}
                  </div>
                )}
                {fixture.state !== "finalized" && fixture.state !== "cancelled" && (
                  <FixtureSchedulePicker
                    confirmedStartAt={fixture.confirmed_start_at}
                    onConfirm={async (at) => {
                      await confirmScheduleAction(fixture.id, at);
                      await load(seasonId);
                      setMessage("Schedule saved");
                    }}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={async () => {
                      await postponeFixtureAction(fixture.id);
                      await load(seasonId);
                    }}
                  >
                    Postpone
                  </button>
                  <button
                    type="button"
                    className="btn-danger text-xs"
                    onClick={async () => {
                      await cancelFixtureAction(fixture.id);
                      await load(seasonId);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={async () => {
                      await addStreamLinkAction(
                        fixture.id,
                        "https://www.twitch.tv/example",
                        "Stream",
                      );
                      setMessage("Stream link added");
                    }}
                  >
                    Add Twitch link
                  </button>
                </div>
                {fixture.state !== "finalized" && fixture.state !== "cancelled" && (
                  <ResultEntry
                    playerAName={pa?.display_name}
                    playerBName={pb?.display_name}
                    onSubmit={async (games) => {
                      await submitResultAction(fixture.id, games);
                      await load(seasonId);
                    }}
                  />
                )}
                {fixture.state === "result_pending" && (
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={async () => {
                      await finalizeResultAction(fixture.id);
                      await load(seasonId);
                    }}
                  >
                    Finalize result
                  </button>
                )}
                {fixture.state === "finalized" && (
                  <ResultEntry
                    playerAName={pa?.display_name}
                    playerBName={pb?.display_name}
                    onSubmit={async (games) => {
                      await correctResultAction(fixture.id, games);
                      await load(seasonId);
                    }}
                  />
                )}
              </div>
            );
              })
              )}
          </RoundCollapsibleSection>
          );
        })}
      </section>
    </div>
  );
}
