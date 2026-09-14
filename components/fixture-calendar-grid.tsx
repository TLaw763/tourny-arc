"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildFixtureMatchDisplay } from "@/lib/fixture-match-display";
import type { PublicScheduleFixture } from "@/lib/queries";

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function CalendarFixtureEvent({
  fixture,
}: {
  fixture: PublicScheduleFixture & { confirmed_start_at: string };
}) {
  const display = buildFixtureMatchDisplay(fixture.state, fixture.match_outcome, fixture.match_games);
  const aWinner = display.winnerSide === "a";
  const bWinner = display.winnerSide === "b";

  return (
    <Link href={`/fixtures/${fixture.id}`} className="calendar-grid-event">
      <span className="calendar-grid-event-time">
        {new Date(fixture.confirmed_start_at).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
      <span className="calendar-grid-event-score">{display.centerScore}</span>
      <span className="calendar-grid-event-players">
        <span className={aWinner ? "calendar-grid-event-player calendar-grid-event-player--winner" : "calendar-grid-event-player"}>
          {fixture.participant_a_name}
        </span>
        <span className="calendar-grid-event-vs">vs</span>
        <span className={bWinner ? "calendar-grid-event-player calendar-grid-event-player--winner" : "calendar-grid-event-player"}>
          {fixture.participant_b_name}
        </span>
      </span>
    </Link>
  );
}

export function FixtureCalendarGrid({ fixtures }: { fixtures: PublicScheduleFixture[] }) {
  const scheduled = fixtures.filter(
    (f): f is PublicScheduleFixture & { confirmed_start_at: string } => Boolean(f.confirmed_start_at),
  );

  const initial = scheduled[0]?.confirmed_start_at
    ? new Date(scheduled[0].confirmed_start_at)
    : new Date();
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const byDay = useMemo(() => {
    const map = new Map<string, Array<PublicScheduleFixture & { confirmed_start_at: string }>>();
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
          return (
            <div key={key} className="calendar-grid-cell">
              <span className="calendar-grid-day">{day}</span>
              <ul className="calendar-grid-events">
                {dayFixtures.map((f) => (
                  <li key={f.id}>
                    <CalendarFixtureEvent fixture={f} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
