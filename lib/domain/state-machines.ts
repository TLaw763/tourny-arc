import type { FixtureState } from "@/lib/domain/types";

/** Allowed fixture state transitions per competition-tools-plan §4. */
export const FIXTURE_TRANSITIONS: Readonly<
  Record<FixtureState, readonly FixtureState[]>
> = {
  generated: ["time_proposed", "postponed", "cancelled"],
  time_proposed: ["confirmed", "time_proposed", "postponed", "cancelled"],
  confirmed: ["in_progress", "postponed", "cancelled"],
  in_progress: ["result_pending", "postponed", "cancelled"],
  result_pending: ["finalized", "disputed", "postponed", "cancelled"],
  disputed: ["finalized", "result_pending"],
  finalized: [],
  postponed: ["time_proposed", "confirmed", "cancelled"],
  cancelled: [],
};

/** States visible only to participants and organizers (D-046). */
export const PROVISIONAL_FIXTURE_STATES: ReadonlySet<FixtureState> = new Set([
  "generated",
  "time_proposed",
]);

/** States eligible for public calendar once confirmedStartAt is set. */
export const PUBLIC_CALENDAR_ELIGIBLE_STATES: ReadonlySet<FixtureState> = new Set([
  "confirmed",
  "in_progress",
  "result_pending",
  "disputed",
  "finalized",
  "postponed",
]);

export function canTransitionFixture(from: FixtureState, to: FixtureState): boolean {
  return FIXTURE_TRANSITIONS[from].includes(to);
}

export function isProvisionalFixture(state: FixtureState): boolean {
  return PROVISIONAL_FIXTURE_STATES.has(state);
}

export function isPublicCalendarEligible(state: FixtureState): boolean {
  return PUBLIC_CALENDAR_ELIGIBLE_STATES.has(state);
}

/** Public list/detail: includes unscheduled expected matchups. */
export function isPublicScheduleEligible(state: FixtureState): boolean {
  return (
    PUBLIC_CALENDAR_ELIGIBLE_STATES.has(state) ||
    state === "generated" ||
    state === "time_proposed"
  );
}

export function isCancelledFixture(state: FixtureState): boolean {
  return state === "cancelled";
}

/** Whether scheduling/result actions are allowed on this fixture. */
export function isFixtureMutable(state: FixtureState): boolean {
  return state !== "cancelled" && state !== "finalized";
}

/** Advance fixture toward result_pending when a score is submitted (confirmed → in_progress → result_pending). */
export function advanceFixtureToResultPending(state: FixtureState): FixtureState | null {
  if (canTransitionFixture(state, "result_pending")) {
    return "result_pending";
  }
  if (state === "confirmed" && canTransitionFixture(state, "in_progress")) {
    return canTransitionFixture("in_progress", "result_pending")
      ? "result_pending"
      : "in_progress";
  }
  return null;
}
