"use client";

import { useState } from "react";
import { formatBanListEntryLabel } from "@/lib/ban-list-display";
import {
  BAN_LIST_CATEGORIES,
  BAN_LIST_CATEGORY_LABELS,
  groupBanListByCategory,
} from "@/lib/domain/ban-list";
import type { BanListDraftRow } from "@/lib/ban-list/draft";
import type { BanListCategory, SeasonBanListEntry } from "@/lib/domain/types";

type BanListDragBoardProps = {
  entries: BanListDraftRow[];
  disabled?: boolean;
  onMove: (clientId: string, category: BanListCategory) => void;
  onRemove: (clientId: string) => void;
};

function asSeasonEntry(row: BanListDraftRow): SeasonBanListEntry {
  return {
    id: row.clientId,
    seasonId: "",
    cardName: row.cardName,
    cardId: row.cardId,
    category: row.category,
    genesysPoints: row.genesysPoints,
    updatedAt: "",
  };
}

export function BanListDragBoard({
  entries,
  disabled = false,
  onMove,
  onRemove,
}: BanListDragBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<BanListCategory | null>(null);
  const grouped = groupBanListByCategory(entries.map(asSeasonEntry));

  function handleDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleDrop(section: BanListCategory, clientId: string) {
    setDropTarget(null);
    onMove(clientId, section);
  }

  return (
    <div className="ban-list-grid">
      {BAN_LIST_CATEGORIES.map((section) => {
        const isDropTarget = dropTarget === section && draggingId != null;
        const sectionEntries = entries.filter((entry) => entry.category === section);

        return (
          <div
            key={section}
            className={`ban-list-section panel-subtle${isDropTarget ? " ban-list-section--drop-target" : ""}`}
            onDragOver={(e) => {
              if (disabled || !draggingId) return;
              e.preventDefault();
              setDropTarget(section);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDropTarget((current) => (current === section ? null : current));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const clientId = e.dataTransfer.getData("text/ban-entry-id") || draggingId;
              if (clientId) handleDrop(section, clientId);
            }}
          >
            <h3 className="ban-list-section-title">
              {BAN_LIST_CATEGORY_LABELS[section]}
              <span className="ban-list-section-count">{grouped[section].length}</span>
            </h3>

            <ul className="ban-list-items ban-list-items--droppable">
              {sectionEntries.length === 0 ? (
                <li className="ban-list-drop-placeholder">
                  {isDropTarget ? "Release to move here" : "Drop cards here"}
                </li>
              ) : (
                sectionEntries.map((entry) => (
                  <li
                    key={entry.clientId}
                    className={`ban-list-item ban-list-item--draggable${
                      draggingId === entry.clientId ? " ban-list-item--dragging" : ""
                    }`}
                    draggable={!disabled}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/ban-entry-id", entry.clientId);
                      e.dataTransfer.effectAllowed = "move";
                      if (!disabled) setDraggingId(entry.clientId);
                    }}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="ban-list-item-main">
                      <span className="ban-list-drag-handle" aria-hidden="true">
                        ⠿
                      </span>
                      <span className="ban-list-item-name">
                        {formatBanListEntryLabel(asSeasonEntry(entry))}
                      </span>
                    </div>
                    <div className="ban-list-item-actions">
                      <button
                        type="button"
                        className="btn-danger text-xs"
                        disabled={disabled}
                        onClick={() => onRemove(entry.clientId)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
