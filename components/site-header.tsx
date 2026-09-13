import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { TeLogo } from "@/components/te-logo";
import { getSession } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/auth-admin";
import { resolvePublicSeasonId } from "@/lib/selected-season";

export async function SiteHeader() {
  const session = await getSession();
  const seasonId = await resolvePublicSeasonId();
  const fixturesHref = seasonId ? `/seasons/${seasonId}/schedule` : "/fixtures";
  const standingsHref = seasonId ? `/standings?seasonId=${seasonId}` : "/standings";
  const banListHref = seasonId ? `/seasons/${seasonId}/ban-list` : null;

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold no-underline">
          <TeLogo />
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={fixturesHref}>Fixtures</Link>
          <Link href={standingsHref}>Standings</Link>
          {banListHref && <Link href={banListHref}>Ban list</Link>}
          {session ? (
            <AccountMenu email={session.email} isAdmin={isSiteAdminEmail(session.email)} />
          ) : (
            <Link href="/login" className="btn-primary no-underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
