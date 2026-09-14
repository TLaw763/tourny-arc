"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildFixtureMatchDisplay } from "@/lib/fixture-match-display";
import type { PublicScheduleFixture } from "@/lib/queries";

type ScheduledFixture = PublicScheduleFixture & { confirmed_start_at: string };

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sortByStart(fixtures: ScheduledFixture[]) {
  return [...fixtures].sort(
    (a, b) => new Date(a.confirmed_start_at).getTime() - new Date(b.confirmed_start_at).getTime(),
  );
}

function featuredFixtureForDay(fixtures: ScheduledFixture[], dayDate: Date, now: Date) {
  const sorted = sortByStart(fixtures);
  if (sorted.length === 0) return null;

  const dayStart = startOfDay(dayDate);
  const todayStart = startOfDay(now);

  if (dayStart.getTime() < todayStart.getTime()) {
    return sorted[sorted.length - 1];
  }
  if (dayStart.getTime() > todayStart.getTime()) {
    return sorted[0];
  }

  const upcoming = sorted.find(
    (fixture) =>
      fixture.state === "in_progress" ||
      new Date(fixture.confirmed_start_at).getTime() >= now.getTime(),
  );
  return upcoming ?? sorted[sorted.length - 1];
}

function splitPastAndUpcoming(fixtures: ScheduledFixture[], now: Date) {
  const sorted = sortByStart(fixtures);
  const past: ScheduledFixture[] = [];
  const upcoming: ScheduledFixture[] = [];

  for (const fixture of sorted) {
    const startMs = new Date(fixture.confirmed_start_at).getTime();
    if (fixture.state === "in_progress" || startMs >= now.getTime()) {
      upcoming.push(fixture);
    } else {
      past.push(fixture);
    }
  }

  return { past, upcoming };
}

function CalendarFixtureEvent({
  fixture,
  compact = false,
}: {
  fixture: ScheduledFixture;
  compact?: boolean;
}) {
  const display = buildFixtureMatchDisplay(fixture.state, fixture.match_outcome, fixture.match_games);
  const aWinner = display.winnerSide === "a";
  const bWinner = display.winnerSide === "b";

  return (
    <Link
      href={`/fixtures/${fixture.id}`}
      className={compact ? "calendar-grid-event calendar-grid-event--compact" : "calendar-grid-event"}
    >
      <span className="calendar-grid-event-time">
        {new Date(fixture.confirmed_start_at).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
      <span className="calendar-grid-event-score">{display.centerScore}</span>
      <span className="calendar-grid-event-players">
        <span
          className={
            aWinner
              ? "calendar-grid-event-player calendar-grid-event-player--winner"
              : "calendar-grid-event-player"
          }
        >
          {fixture.participant_a_name}
          {fixture.participant_a_player_id && (
            <span className="calendar-grid-event-player-id">{fixture.participant_a_player_id}</span>
          )}
        </span>
        <span className="calendar-grid-event-vs">vs</span>
        <span
          className={
            bWinner
              ? "calendar-grid-event-player calendar-grid-event-player--winner"
              : "calendar-grid-event-player"
          }
        >
          {fixture.participant_b_name}
          {fixture.participant_b_player_id && (
            <span className="calendar-grid-event-player-id">{fixture.participant_b_player_id}</span>
          )}
        </span>
      </span>
    </Link>
  );
}

function CalendarDayPopover({ fixtures, now }: { fixtures: ScheduledFixture[]; now: Date }) {
  const { past, upcoming } = splitPastAndUpcoming(fixtures, now);

  return (
    <div className="calendar-grid-day-popover" role="tooltip">
      <p className="calendar-grid-day-popover-title">
        {fixtures.length} match{fixtures.length === 1 ? "" : "es"}
      </p>
      {upcoming.length > 0 && (
        <div className="calendar-grid-day-popover-section">
          <p className="calendar-grid-day-popover-label">Upcoming</p>
          <ul className="calendar-grid-day-popover-list">
            {upcoming.map((fixture) => (
              <li key={fixture.id}>
                <CalendarFixtureEvent fixture={fixture} compact />
              </li>
            ))}
          </ul>
        </div>
      )}
      {past.length > 0 && (
        <div className="calendar-grid-day-popover-section">
          <p className="calendar-grid-day-popover-label">Earlier</p>
          <ul className="calendar-grid-day-popover-list">
            {past.map((fixture) => (
              <li key={fixture.id}>
                <CalendarFixtureEvent fixture={fixture} compact />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FixtureCalendarGrid({ fixtures }: { fixtures: PublicScheduleFixture[] }) {
  const scheduled = fixtures.filter(
    (f): f is ScheduledFixture => Boolean(f.confirmed_start_at),
  );

  const initial = scheduled[0]?.confirmed_start_at
    ? new Date(scheduled[0].confirmed_start_at)
    : new Date();
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduledFixture[]>();
    for (const fixture of scheduled) {
      const d = new Date(fixture.confirmed_start_at);
      const key = monthKey(d.getFullYear(), d.getMonth()) + "-" + String(d.getDate()).padStart(2, "0");
      const list = map.get(key) ?? [];
      list.push(fixture);
      map.set(key, list);
    }
    return map;
  }, [scheduled]);

  const { year, month } = cursor;
  const totalDays = daysInMonth(year, month);
  const leading = startWeekday(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < leading; i++) cells.push({ day: null, key: `pad-${i}` });
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ day, key: `${year}-${month}-${day}` });
  }

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <div className="calendar-grid">
      <div className="calendar-grid-toolbar">
        <button type="button" className="btn-secondary" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ←
        </button>
        <h2 className="calendar-grid-title">{monthLabel}</h2>
        <button type="button" className="btn-secondary" onClick={() => shiftMonth(1)} aria-label="Next month">
          →
        </button>
      </div>
      <div className="calendar-grid-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="calendar-grid-weekday">
            {d}
          </div>
        ))}
      </div>
      <div className="calendar-grid-cells">
        {cells.map(({ day, key }) => {
          if (day === null) {
            return <div key={key} className="calendar-grid-cell calendar-grid-cell--empty" />;
          }
          const dayKey = `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
          const dayFixtures = byDay.get(dayKey) ?? [];
          const dayDate = new Date(year, month, day);
          const featured = featuredFixtureForDay(dayFixtures, dayDate, now);
          const extraCount = dayFixtures.length > 1 ? dayFixtures.length - 1 : 0;

          return (
            <div key={key} className="calendar-grid-cell calendar-grid-cell--interactive">
              <div className="calendar-grid-cell-head">
                <span className="calendar-grid-day">{day}</span>
                {dayFixtures.length > 0 && (
                  <span className="calendar-grid-day-count" title={`${dayFixtures.length} matches`}>
                    {dayFixtures.length}
                  </span>
                )}
              </div>
              {featured && (
                <div className="calendar-grid-featured">
                  <CalendarFixtureEvent fixture={featured} />
                  {extraCount > 0 && (
                    <span className="calendar-grid-more-hint">+{extraCount} more on hover</span>
                  )}
                </div>
              )}
              {dayFixtures.length > 0 && (
                <CalendarDayPopover fixtures={dayFixtures} now={now} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
