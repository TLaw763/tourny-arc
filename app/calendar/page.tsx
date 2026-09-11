import { redirect } from "next/navigation";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string; view?: string }>;
}) {
  const params = await searchParams;
  if (params.seasonId) {
    const q = new URLSearchParams();
    if (params.view) q.set("view", params.view);
    const suffix = q.toString();
    redirect(
      suffix
        ? `/seasons/${params.seasonId}/schedule?${suffix}`
        : `/seasons/${params.seasonId}/schedule`,
    );
  }
  redirect("/fixtures");
}
