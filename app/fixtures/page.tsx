import { redirect } from "next/navigation";
import { resolvePublicSeasonId } from "@/lib/selected-season";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const seasonId = await resolvePublicSeasonId();
  if (!seasonId) redirect("/");
  redirect(`/seasons/${seasonId}/schedule`);
}
