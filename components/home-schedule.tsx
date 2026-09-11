"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FixtureCalendarGrid, type CalendarFixture } from "@/components/fixture-calendar-grid";
import { FixtureList, type FixtureListItem } from "@/components/fixture-list";

type HomeScheduleProps = {
  seasonId: string;
  seasonLabel: string;
  calendarFixtures: FixtureListItem[];
  listFixtures: FixtureListItem[];
  rounds: Array<{ id: string; label: string; sequence: number }>;
};

export function HomeSchedule({
  seasonId,
  seasonLabel,
  calendarFixtures: calendarSource,
  listFixtures,
  rounds,
}: HomeScheduleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "calendar";
  const basePath = `/seasons/${seasonId}/schedule`;

  const calendarFixtures: CalendarFixture[] = calendarSource
    .filter((f): f is FixtureListItem & { confirmed_start_at: string } => !!f.confirmed_start_at)
    .map((f) => ({
      id: f.id,
      confirmed_start_at: f.confirmed_start_at,
      participant_a_name: f.participant_a_name,
      participant_b_name: f.participant_b_name,
    }));

  function updateView(next: "calendar" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") params.set("view", "list");
    else params.delete("view");
    const q = params.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/" className="text-sm">
          ← All tournaments
        </Link>
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{seasonLabel}</p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {view === "calendar"
            ? "Confirmed fixtures on the calendar. Switch to List for all matchups by round."
            : "All rounds are listed — expand any round to see matchups and status."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/seasons/${seasonId}`} className="text-sm font-medium">
          Tournament home
        </Link>

        <div className="view-toggle" role="tablist" aria-label="Schedule view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "calendar"}
            className={view === "calendar" ? "view-toggle-btn view-toggle-btn--active" : "view-toggle-btn"}
            onClick={() => updateView("calendar")}
          >
            Calendar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "list"}
            className={view === "list" ? "view-toggle-btn view-toggle-btn--active" : "view-toggle-btn"}
            onClick={() => updateView("list")}
          >
            List
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        calendarFixtures.length > 0 ? (
          <FixtureCalendarGrid fixtures={calendarFixtures} />
        ) : (
          <p className="text-[var(--color-text-muted)]">
            No confirmed fixtures on the calendar yet.
          </p>
        )
      ) : (
        <FixtureList fixtures={listFixtures} rounds={rounds} />
      )}
    </div>
  );
}
