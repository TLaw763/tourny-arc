import { redirect } from "next/navigation";
import { AdminBanlistPanel } from "@/components/admin-banlist-panel";
import { getReferenceBanlistMetaAction } from "@/lib/actions/admin-banlist";
import { getSession } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/auth-admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !isSiteAdminEmail(session.email)) {
    redirect("/");
  }

  const meta = await getReferenceBanlistMetaAction();

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
    </div>
  );
}
