"use client";

import { useEffect, useState } from "react";

type ColorMode = "light" | "dark";

function applyMode(mode: ColorMode) {
  document.documentElement.setAttribute("data-color-mode", mode);
  localStorage.setItem("color-mode", mode);
}

export function ColorModeSwitcher({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ColorMode>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-color-mode");
    if (current === "dark" || current === "light") setMode(current);
  }, []);

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
