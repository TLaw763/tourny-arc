"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ACCESS_CONTACT_EMAIL } from "@/lib/constants";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/organizer";
  const authError = searchParams.get("error") === "auth";
  const inviteOnly = searchParams.get("error") === "invite_only";
  const databaseError = searchParams.get("reason") === "database";
  const authReason = searchParams.get("reason");
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="panel mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">Sign in</h1>
      {inviteOnly ? (
        <div className="space-y-2 text-sm">
          <p className="text-[var(--color-danger)]">
            New accounts are invite-only during launch.
          </p>
          <p className="text-[var(--color-text-muted)]">
            If you already have access, sign in with the Google account that was invited. To
            request access, email{" "}
            <a href={`mailto:${ACCESS_CONTACT_EMAIL}`} className="font-medium">
              {ACCESS_CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">
          Sign in with your Google account. New accounts require an invitation.
        </p>
      )}
      {authError && databaseError && (
        <div className="space-y-2 text-sm text-[var(--color-danger)]">
          <p>
            Google sign-in reached Supabase, but creating your profile failed (database trigger).
          </p>
          <p className="text-[var(--color-text-muted)]">
            In Supabase → <strong>SQL Editor</strong>, run{" "}
            <code>supabase/migrations/003_fix_auth_profile_trigger.sql</code>, then try again.
          </p>
        </div>
      )}
      {authError && !databaseError && !inviteOnly && (
        <div className="space-y-2 text-sm text-[var(--color-danger)]">
          <p>Sign-in failed. Add this exact redirect URL in Supabase → Authentication → URL Configuration → Redirect URLs:</p>
          <p className="rounded-md bg-[var(--color-surface-subtle)] p-2 font-mono text-xs text-[var(--color-text)]">
            {origin}/auth/callback
          </p>
          <p className="text-[var(--color-text-muted)]">
            Use <strong>http</strong> (not https) for local dev. After saving in Supabase, try again.
            {authReason === "exchange" && " The OAuth callback reached the app but session exchange failed — double-check the redirect URL matches exactly."}
          </p>
        </div>
      )}
      <GoogleSignInButton next={next} />
      {!inviteOnly && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Need access? Contact{" "}
          <a href={`mailto:${ACCESS_CONTACT_EMAIL}`}>{ACCESS_CONTACT_EMAIL}</a>
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
