# Tornament Enigmic

League and tournament management — production slice per [docs/standalone-launch-spec.md](docs/standalone-launch-spec.md).

**Production:** [tornament.enigmic.co.za](https://tornament.enigmic.co.za)  
**Stack:** Next.js App Router, Supabase Auth, Supabase Postgres, Server Actions, Vercel.

## Local setup

1. Create a Supabase project (EU region recommended).
2. Run migrations in Supabase → SQL Editor (in order):
   - `001_initial_schema.sql`
   - `003_fix_auth_profile_trigger.sql` (always run on fresh setup)
3. Copy `.env.example` → `.env.local` and fill in credentials.
4. Enable **Google** provider in Supabase → Authentication → Providers.
5. Add redirect URLs in Supabase → Authentication → URL Configuration:
   - `http://localhost:3000/auth/callback`
   - `https://tornament.enigmic.co.za/auth/callback`

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # domain logic tests
pnpm build
```

## Deploy to Vercel

### 1. Create the Vercel project

1. Import [github.com/TLaw763/tourny-arc](https://github.com/TLaw763/tourny-arc) in [Vercel](https://vercel.com/new).
2. Set the **Project Name** to `tornament-enigmic`.
3. Framework preset: **Next.js** (auto-detected).

### 2. Environment variables

In Vercel → Project → Settings → Environment Variables, add:

| Variable | Value |
| -------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Production only) |
| `NEXT_PUBLIC_APP_URL` | `https://tornament.enigmic.co.za` |

Optional: `ALLOWED_SIGNUP_EMAILS` — comma-separated allowlist for new sign-ups.

Deploy once env vars are set.

### 3. Custom domain

1. Vercel → Project → Settings → Domains → Add `tornament.enigmic.co.za`.
2. At your DNS host for `enigmic.co.za`, add the record Vercel shows (usually):
   - **Type:** CNAME
   - **Name:** `tornament`
   - **Value:** `cname.vercel-dns.com`
3. Wait for DNS propagation and Vercel SSL provisioning.

### 4. Supabase production auth

In Supabase → Authentication → URL Configuration:

- **Site URL:** `https://tornament.enigmic.co.za`
- **Redirect URLs:** include `https://tornament.enigmic.co.za/auth/callback`

### 5. Smoke test

- Sign in with Google
- Organizer wizard → create season → generate fixtures → enter result → standings

## Features (v1)

- Supabase Auth sign up / sign in
- Organizer wizard (basics → format → roster → review)
- League generation: single/double round-robin + manual import
- Roster management + email invites
- Fixture scheduling, Twitch streams, results, standings rebuild
- Participant: my fixtures, propose times, submit results
- Public: calendar, standings, fixture detail, player overview

See [docs/MIGRATION.md](docs/MIGRATION.md) for monorepo cutover path.
