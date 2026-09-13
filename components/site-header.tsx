import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { TeLogo } from "@/components/te-logo";
import { getSession } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/auth-admin";
import { getSelectedSeasonId } from "@/lib/selected-season";

export async function SiteHeader() {
  const session = await getSession();
  const seasonId = await getSelectedSeasonId();

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold no-underline">
          <TeLogo />
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {seasonId && (
            <>
              <Link href={`/seasons/${seasonId}/schedule`}>Fixtures</Link>
              <Link href={`/standings?seasonId=${seasonId}`}>Standings</Link>
              <Link href={`/seasons/${seasonId}/ban-list`}>Ban list</Link>
            </>
          )}
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
