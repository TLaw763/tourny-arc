"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { ACCESS_CONTACT_EMAIL } from "@/lib/constants";

function appOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/organizer";
  const authError = searchParams.get("error") === "auth";
  const inviteOnly = searchParams.get("error") === "invite_only";
  const databaseError = searchParams.get("reason") === "database";
  const origin = appOrigin();

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
          <p>Sign-in failed. Check Supabase → Authentication → URL Configuration:</p>
          <ul className="list-inside list-disc space-y-1 text-[var(--color-text-muted)]">
            <li>
              <strong>Site URL:</strong> <code>{origin}</code>
            </li>
            <li>
              <strong>Redirect URL:</strong> <code>{origin}/auth/callback</code>
            </li>
          </ul>
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
