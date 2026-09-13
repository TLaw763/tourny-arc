"use client";

import { useState } from "react";

type ColorMode = "light" | "dark";

function readMode(): ColorMode {
  const current = document.documentElement.getAttribute("data-color-mode");
  return current === "dark" || current === "light" ? current : "dark";
}

function applyMode(mode: ColorMode) {
  document.documentElement.setAttribute("data-color-mode", mode);
  localStorage.setItem("color-mode", mode);
}

export function ColorModeSwitcher({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ColorMode>(() =>
    typeof document === "undefined" ? "dark" : readMode(),
  );

  function toggle() {
    const next: ColorMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
  }

  return (
    <button
      type="button"
      className={compact ? "account-menu-item" : "btn-secondary"}
      onClick={toggle}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mode === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
