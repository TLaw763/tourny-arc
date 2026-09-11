"use client";

import { useState } from "react";
import {
  defaultScheduleDatetime,
  fromDatetimeLocalValue,
} from "@/lib/fixture-display";

export function FixtureSchedulePicker({
  confirmedStartAt,
  onConfirm,
  label = "Schedule",
}: {
  confirmedStartAt?: string | null;
  onConfirm: (iso: string) => Promise<void>;
  label?: string;
}) {
  const [datetime, setDatetime] = useState(() => defaultScheduleDatetime(confirmedStartAt));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!datetime) {
      setError("Pick a date and time");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(fromDatetimeLocalValue(datetime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="schedule-picker space-y-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{label}</span>
        <input
          type="datetime-local"
          className="field-input max-w-xs"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
        />
      </label>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <button type="button" className="btn-primary text-xs" disabled={loading} onClick={handleConfirm}>
        {loading ? "Saving…" : confirmedStartAt ? "Update schedule" : "Confirm schedule"}
      </button>
    </div>
  );
}
