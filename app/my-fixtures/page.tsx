import Link from "next/link";
import { redirect } from "next/navigation";
import { FixtureStateBadge } from "@/components/fixture-state-badge";
import { MyFixtureActions } from "@/components/my-fixture-actions";
import { getSession } from "@/lib/auth";
import { getMyFixtures } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MyFixturesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/my-fixtures");

  const fixtures = await getMyFixtures(session.userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My fixtures</h1>
      {fixtures.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">
          No fixtures linked to your account. Accept an invitation or ask your organizer to link
          your roster entry.
        </p>
      ) : (
        fixtures.map((f) => {
          const pa = (Array.isArray(f.participant_a) ? f.participant_a[0] : f.participant_a) as
            | { display_name: string }
            | null;
          const pb = (Array.isArray(f.participant_b) ? f.participant_b[0] : f.participant_b) as
            | { display_name: string }
            | null;
          const match = (Array.isArray(f.matches) ? f.matches[0] : f.matches) as
            | { outcome?: string | null }
            | null;
          const round = (Array.isArray(f.rounds) ? f.rounds[0] : f.rounds) as
            | { label?: string }
            | null;
          return (
            <div key={f.id} className="panel space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {round?.label && (
                  <span className="fixture-round-badge">{round.label}</span>
                )}
                <Link href={`/fixtures/${f.id}`} className="font-medium">
                  {pa?.display_name} vs {pb?.display_name}
                </Link>
                <FixtureStateBadge
                  state={f.state}
                  confirmedStartAt={f.confirmed_start_at}
                  matchOutcome={match?.outcome}
                  participantAName={pa?.display_name}
                  participantBName={pb?.display_name}
                />
              </div>
              {f.confirmed_start_at && (
                <p className="text-sm">{new Date(f.confirmed_start_at).toLocaleString()}</p>
              )}
              <MyFixtureActions
                fixtureId={f.id}
                state={f.state}
                playerAName={pa?.display_name}
                playerBName={pb?.display_name}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
