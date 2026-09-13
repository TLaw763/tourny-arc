import { redirect } from "next/navigation";
import { requireSelectedSeasonId } from "@/lib/selected-season";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string; view?: string }>;
}) {
  const params = await searchParams;
  const seasonId = await requireSelectedSeasonId(params.seasonId);

  const q = new URLSearchParams();
  if (params.view) q.set("view", params.view);
  const suffix = q.toString();
  redirect(
    suffix
      ? `/seasons/${seasonId}/schedule?${suffix}`
      : `/seasons/${seasonId}/schedule`,
  );
}
