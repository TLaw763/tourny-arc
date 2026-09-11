"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { acceptInvitationAction } from "@/lib/actions/invitations";

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const inviteNext = token ? `/invite?token=${encodeURIComponent(token)}` : "/invite";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleAccept() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await acceptInvitationAction(token);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="text-[var(--color-danger)]">Missing invitation token.</p>;
  }

  return (
    <div className="panel mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">Accept invitation</h1>
      {done ? (
        <>
          <p>You&apos;re linked to the season roster.</p>
          <Link href="/my-fixtures" className="btn-primary inline-block no-underline">
            View my fixtures
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-text-muted)]">
            Sign in with Google, then accept to link your account to the roster.
          </p>
          <GoogleSignInButton next={inviteNext} label="Sign in with Google" />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <button type="button" className="btn-secondary" onClick={handleAccept} disabled={loading}>
            {loading ? "Accepting…" : "Accept invitation"}
          </button>
        </>
      )}
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <InviteContent />
    </Suspense>
  );
}
