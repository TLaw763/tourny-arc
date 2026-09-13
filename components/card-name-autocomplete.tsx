"use client";

import { useEffect, useState } from "react";
import { searchCardsAction } from "@/lib/actions/card-search";
import type { YgoProDeckCardSummary } from "@/lib/ygoprodeck/types";

type CardNameAutocompleteProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (card: YgoProDeckCardSummary) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function CardNameAutocomplete({
  value,
  onValueChange,
  onSelect,
  disabled = false,
  placeholder = "Search card name…",
}: CardNameAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<YgoProDeckCardSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value.trim().length < 2) return;

    const timer = window.setTimeout(() => {
      setLoading(true);
      searchCardsAction(value)
        .then((results) => setSuggestions(results))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className="card-autocomplete">
      <input
        className="field-input w-full"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          onValueChange(next);
          setOpen(true);
          if (next.trim().length < 2) {
            setSuggestions([]);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && value.trim().length >= 2 && (
        <ul className="card-autocomplete-list" role="listbox">
          {loading && <li className="card-autocomplete-status">Searching…</li>}
          {!loading && suggestions.length === 0 && (
            <li className="card-autocomplete-status">No matches</li>
          )}
          {!loading &&
            suggestions.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  className="card-autocomplete-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(card);
                    onValueChange(card.name);
                    setOpen(false);
                  }}
                >
                  <span>{card.name}</span>
                  {card.banTcg && (
                    <span className="card-autocomplete-meta">TCG {card.banTcg}</span>
                  )}
                  {card.genesysPoints != null && card.genesysPoints > 0 && (
                    <span className="card-autocomplete-meta">{card.genesysPoints} pts</span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
