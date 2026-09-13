/** Paths that require a tournament to be selected first (cookie set via /seasons/[id]). */
export function pathRequiresSelectedTournament(pathname: string): boolean {
  if (pathname === "/standings" || pathname === "/fixtures" || pathname === "/calendar") {
    return true;
  }
  if (pathname.startsWith("/players/")) return true;
  if (/^\/fixtures\/[^/]+/.test(pathname)) return true;
  return false;
}
