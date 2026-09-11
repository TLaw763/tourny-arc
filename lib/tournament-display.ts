export function tournamentInitials(name: string, max = 2) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatSeasonDateRange(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) return null;
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`;
  if (startsAt) return `From ${fmt(startsAt)}`;
  return `Until ${fmt(endsAt!)}`;
}
