"use client";

import { useRouter } from "next/navigation";
import { ResultEntry } from "@/components/result-entry";
import { proposeScheduleAction } from "@/lib/actions/fixtures";
import { finalizeResultAction, submitResultAction } from "@/lib/actions/results";

export function MyFixtureActions({
  fixtureId,
  state,
  playerAName,
  playerBName,
}: {
  fixtureId: string;
  state: string;
  playerAName?: string;
  playerBName?: string;
}) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <>
      {["generated", "time_proposed", "confirmed"].includes(state) && (
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={async () => {
            const at = new Date(Date.now() + 2 * 86400000).toISOString();
            await proposeScheduleAction(fixtureId, at, "Proposed by participant");
            refresh();
          }}
        >
          Propose time (+2d)
        </button>
      )}
      {!["finalized", "cancelled"].includes(state) && (
        <ResultEntry
          playerAName={playerAName}
          playerBName={playerBName}
          onSubmit={async (games) => {
            await submitResultAction(fixtureId, games);
            refresh();
          }}
        />
      )}
      {state === "result_pending" && (
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={async () => {
            await finalizeResultAction(fixtureId);
            refresh();
          }}
        >
          Confirm & finalize
        </button>
      )}
    </>
  );
}
