import { redirect } from "next/navigation";
import { AdminBanlistPanel } from "@/components/admin-banlist-panel";
import { AdminClearFixturesPanel } from "@/components/admin-clear-fixtures-panel";
import { getReferenceBanlistMetaAction } from "@/lib/actions/admin-banlist";
import { getSeasonFixtureSummaryAction } from "@/lib/actions/admin-fixtures";
import { getSession } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/auth-admin";
import { getSelectedSeasonId } from "@/lib/selected-season";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !isSiteAdminEmail(session.email)) {
    redirect("/");
  }

  const meta = await getReferenceBanlistMetaAction();
  const selectedSeasonId = await getSelectedSeasonId();
  const fixtureSummary = selectedSeasonId
    ? await getSeasonFixtureSummaryAction(selectedSeasonId)
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Site admin</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Signed in as {session.email}. Reference banlists are shared across all tournaments.
        </p>
      </div>

      <section className="panel p-4">
        <AdminBanlistPanel initialMeta={meta} />
      </section>

      <section className="panel p-4">
        <AdminClearFixturesPanel summary={fixtureSummary} />
      </section>
    </div>
  );
}
