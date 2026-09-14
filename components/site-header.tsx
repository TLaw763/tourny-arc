import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { TeLogo } from "@/components/te-logo";
import { TournamentNavBrand } from "@/components/tournament-nav-brand";
import { getSession } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/auth-admin";
import { getPublicSeason } from "@/lib/queries";
import { getSelectedSeasonId } from "@/lib/selected-season";

export async function SiteHeader() {
  const session = await getSession();
  const seasonId = await getSelectedSeasonId();
  const tournament = seasonId ? await getPublicSeason(seasonId) : null;

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        {tournament ? (
          <TournamentNavBrand tournament={tournament} />
        ) : (
          <Link href="/" className="text-lg font-bold no-underline">
            <TeLogo />
          </Link>
        )}
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {seasonId && (
            <>
              <Link href={`/seasons/${seasonId}/schedule`}>Fixtures</Link>
              <Link href={`/calendar?seasonId=${seasonId}`}>Calendar</Link>
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
