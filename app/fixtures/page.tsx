import { redirect } from "next/navigation";
import { requireSelectedSeasonId } from "@/lib/selected-season";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const seasonId = await requireSelectedSeasonId();
  redirect(`/seasons/${seasonId}/schedule`);
}
