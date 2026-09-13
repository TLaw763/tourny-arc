"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ColorModeSwitcher } from "@/components/color-mode-switcher";

export function AccountMenu({ email, isAdmin = false }: { email: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = email.split("@")[0] || "Account";

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu-trigger btn-secondary"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="account-menu-panel" role="menu">
          <p className="account-menu-email">{email}</p>
          <Link href="/organizer" className="account-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            Organizer
          </Link>
          {isAdmin && (
            <Link href="/admin" className="account-menu-item" role="menuitem" onClick={() => setOpen(false)}>
              Site admin
            </Link>
          )}
          <Link href="/my-fixtures" className="account-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            My fixtures
          </Link>
          <ColorModeSwitcher compact />
          <form action="/auth/signout" method="post">
            <button type="submit" className="account-menu-item account-menu-signout" role="menuitem">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
