import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureStateBadge } from "@/components/fixture-state-badge";
import { computeMatchOutcome, countGameResults, formatMatchScore } from "@/lib/domain/scoring";
import { getPublicFixture } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const data = await getPublicFixture(fixtureId);
  if (!data) notFound();

  const { fixture, match } = data;
  const pa = (Array.isArray(fixture.participant_a)
    ? fixture.participant_a[0]
    : fixture.participant_a) as {
    id: string;
    display_name: string;
    online_client_username?: string | null;
  };
  const pb = (Array.isArray(fixture.participant_b)
    ? fixture.participant_b[0]
    : fixture.participant_b) as {
    id: string;
    display_name: string;
    online_client_username?: string | null;
  };
  const streams = (fixture.stream_links as Array<{ url: string; label: string | null }>) ?? [];
  const games = (match?.games as Array<{ sequence: number; outcome: string }> | undefined) ?? [];
  const scoreSummary =
    match?.outcome && games.length > 0
      ? formatMatchScore(
          computeMatchOutcome(
            games.map((g) => ({
              sequence: g.sequence,
              outcome: g.outcome as "playerAWin" | "playerBWin" | "draw" | "unplayed",
            })),
          ),
        )
      : match?.outcome
        ? formatMatchScore({
            outcome: match.outcome,
            pointsPlayerA: match.points_player_a,
            pointsPlayerB: match.points_player_b,
            ...countGameResults(games),
            clinched: true,
          })
        : null;

  function playerLabel(p: { display_name: string; online_client_username?: string | null }) {
    return p.online_client_username
      ? `${p.display_name} (@${p.online_client_username})`
      : p.display_name;
  }

  return (
    <div className="space-y-6">
      <Link href="/calendar" className="text-sm">
        ← Calendar
      </Link>
      <div className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            <Link href={`/players/${pa.id}?seasonId=${fixture.season_id}`}>{playerLabel(pa)}</Link>
            {" vs "}
            <Link href={`/players/${pb.id}?seasonId=${fixture.season_id}`}>{playerLabel(pb)}</Link>
          </h1>
          <FixtureStateBadge
            state={fixture.state}
            confirmedStartAt={fixture.confirmed_start_at}
            matchOutcome={match?.outcome}
            participantAName={pa.display_name}
            participantBName={pb.display_name}
          />
        </div>
        {fixture.confirmed_start_at && (
          <p>{new Date(fixture.confirmed_start_at).toLocaleString()}</p>
        )}
        {scoreSummary && <p className="font-semibold">Score: {scoreSummary}</p>}
        {streams.length > 0 && (
          <div>
            <h2 className="font-semibold">Streams</h2>
            <ul>
              {streams.map((s, i) => (
                <li key={i}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label ?? s.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
