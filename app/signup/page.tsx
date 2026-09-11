import { redirect } from "next/navigation";

/** Google OAuth handles both sign-up and sign-in — no separate email registration. */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/login${query}`);
}
