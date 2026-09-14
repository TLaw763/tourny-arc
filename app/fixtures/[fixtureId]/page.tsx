import { notFound, redirect } from "next/navigation";
import { FixtureMatchupDetail } from "@/components/fixture-matchup-detail";
import { getPublicFixtureMatchup } from "@/lib/queries";
import { requireSelectedSeasonId } from "@/lib/selected-season";

export const dynamic = "force-dynamic";

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const matchup = await getPublicFixtureMatchup(fixtureId);
  if (!matchup) notFound();

  const selectedSeasonId = await requireSelectedSeasonId();
  if (matchup.fixture.season_id !== selectedSeasonId) redirect("/");

  return <FixtureMatchupDetail initial={matchup} />;
}
