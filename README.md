# Tourny Arc

Standalone league/tournament management app — production slice per [docs/standalone-launch-spec.md](docs/standalone-launch-spec.md).

**Stack:** Next.js App Router, Supabase Auth, Supabase Postgres, Server Actions, Vercel.

## Setup

1. Create a Supabase project (EU region recommended).
2. Run migrations in Supabase → SQL Editor (in order): `001_initial_schema.sql`, then `003_fix_auth_profile_trigger.sql` if Google sign-in reports a database error.
3. Copy `.env.example` → `.env.local` and fill in credentials.
4. Enable **Google** provider only in Supabase → Authentication → Providers.
5. Add redirect URLs in Supabase → Authentication → URL Configuration:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback` (production)

```bash
pnpm install
pnpm dev          # http://localhost:3000 — use dev locally, not pnpm start
pnpm test         # domain logic tests (pairing, standings, format-plan)
pnpm build        # rebuild after any .env.local change before pnpm start
```

**Google OAuth:** Supabase → Authentication → URL Configuration must include:
`http://localhost:3000/auth/callback` (and your production URL later).
Site URL should be `http://localhost:3000`.

## Features (v1)

- Supabase Auth sign up / sign in
- Organizer wizard (basics → format → roster → review)
- League generation: single/double round-robin + manual import
- Roster management + email invites
- Fixture scheduling, Twitch streams, results, standings rebuild
- Participant: my fixtures, propose times, submit results
- Public: calendar, standings, fixture detail, player overview

## Deployment (Vercel)

1. Link repo to Vercel
2. Set env vars from `.env.example`
3. Deploy; smoke test wizard → generation → results → standings

See [docs/MIGRATION.md](docs/MIGRATION.md) for monorepo cutover path.
