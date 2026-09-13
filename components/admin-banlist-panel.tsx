"use client";

import { useState } from "react";
import {
  getReferenceBanlistMetaAction,
  syncReferenceBanlistAction,
  type ReferenceBanlistMeta,
} from "@/lib/actions/admin-banlist";
import type { ReferenceBanlistFormat } from "@/lib/ygoprodeck/types";

const FORMATS: Array<{ id: ReferenceBanlistFormat; label: string; syncLabel: string }> = [
  { id: "tcg", label: "Yu-Gi-Oh! TCG", syncLabel: "Sync from YGOProDeck" },
  {
    id: "master_duel",
    label: "Master Duel",
    syncLabel: "Sync from YAML Yugi",
  },
  { id: "genesys", label: "Genesys (point costs)", syncLabel: "Sync from YGOProDeck" },
];

type AdminBanlistPanelProps = {
  initialMeta: ReferenceBanlistMeta[];
};

export function AdminBanlistPanel({ initialMeta }: AdminBanlistPanelProps) {
  const [meta, setMeta] = useState(initialMeta);
  const [busyFormat, setBusyFormat] = useState<ReferenceBanlistFormat | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshMeta() {
    setMeta(await getReferenceBanlistMetaAction());
  }

  async function sync(format: ReferenceBanlistFormat) {
    setBusyFormat(format);
    setMessage(null);
    setError(null);
    try {
      const result = await syncReferenceBanlistAction(format);
      await refreshMeta();
      setMessage(`Synced ${result.entryCount} entries for ${format.replace("_", " ")}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setError(
        msg.includes("reference_banlist")
          ? "Database tables missing. In Supabase → SQL Editor, run supabase/migrations/010_reference_banlist.sql (and 009_season_ban_list.sql if you have not already), then try again."
          : msg,
      );
    } finally {
      setBusyFormat(null);
    }
  }

  function metaFor(format: ReferenceBanlistFormat) {
    return meta.find((row) => row.format === format);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        Pull official card data from{" "}
        <a href="https://ygoprodeck.com/api-guide/" target="_blank" rel="noreferrer">
          YGOProDeck
        </a>{" "}
        (TCG, Genesys) and{" "}
        <a
          href="https://github.com/DawnbrandBots/yaml-yugi-limit-regulation"
          target="_blank"
          rel="noreferrer"
        >
          YAML Yugi
        </a>{" "}
        (Master Duel). Organizers can import these reference lists into their tournament overlays.
      </p>

      {message && <p className="text-sm text-[var(--color-success)]">{message}</p>}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="admin-banlist-grid">
        {FORMATS.map(({ id, label, syncLabel }) => {
          const row = metaFor(id);
          return (
            <article key={id} className="panel-subtle space-y-3 p-4">
              <h2 className="font-semibold">{label}</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-text-muted)]">Entries</dt>
                  <dd>{row?.entryCount ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-text-muted)]">Last sync</dt>
                  <dd>{row ? new Date(row.syncedAt).toLocaleString() : "Never"}</dd>
                </div>
              </dl>
              {row?.sourceNote && (
                <p className="text-xs text-[var(--color-text-muted)]">{row.sourceNote}</p>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={busyFormat != null}
                onClick={() => void sync(id)}
              >
                {busyFormat === id ? "Syncing…" : syncLabel}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
