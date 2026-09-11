"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CalendarFixture = {
  id: string;
  confirmed_start_at: string;
  participant_a_name: string;
  participant_b_name: string;
};

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function FixtureCalendarGrid({ fixtures }: { fixtures: CalendarFixture[] }) {
  const initial = fixtures[0]?.confirmed_start_at
    ? new Date(fixtures[0].confirmed_start_at)
    : new Date();
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarFixture[]>();
    for (const fixture of fixtures) {
      const d = new Date(fixture.confirmed_start_at);
      const key = monthKey(d.getFullYear(), d.getMonth()) + "-" + String(d.getDate()).padStart(2, "0");
      const list = map.get(key) ?? [];
      list.push(fixture);
      map.set(key, list);
    }
    return map;
  }, [fixtures]);

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
                    <Link href={`/fixtures/${f.id}`} className="calendar-grid-event">
                      <span className="calendar-grid-event-time">
                        {new Date(f.confirmed_start_at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="calendar-grid-event-label">
                        {f.participant_a_name} vs {f.participant_b_name}
                      </span>
                    </Link>
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
