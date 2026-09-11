# Standalone launch spec — Competition Tools (Vercel + Supabase)

Use this document to bootstrap a **separate repository** that ships a production-ready
league/tournament app **without modifying** the main
[`enigmic-competition-tools`](https://github.com/TLaw763/enigmic-competition-tools)
incubation monorepo. When the Fastify API + full platform integration is ready, data
and users can migrate forward (see §8).

---

## 1. Purpose

| Goal | Detail |
| ---- | ------ |
| **Ship now** | Live app on Vercel with durable Supabase Postgres |
| **Do not block** | Main repo continues Pre-prod B (Fastify persistence, AWS path, `@enigmic/competition-identity`) |
| **Auth** | **Supabase Auth** (email/password; Google optional) instead of embedded identity service |
| **Scope** | League-first MVP matching what the monorepo already proves in dev |

This is a **tactical production slice**, not a replacement for the long-term architecture
(competition-api, integration ports, card platform hooks).

---

## 2. Relationship to the main monorepo

```text
┌─────────────────────────────┐     ┌──────────────────────────────┐
│  standalone-competition-app │     │  enigmic-competition-tools   │
│  (new repo — build this)    │     │  (existing — keep incubating)│
├─────────────────────────────┤     ├──────────────────────────────┤
│  Next.js App Router         │     │  competition-api (Fastify)   │
│  Supabase Auth              │     │  competition-identity        │
│  Supabase Postgres + RLS    │     │  competition-core (library)  │
│  Server Actions / Route Hdl │     │  OpenAPI contract            │
│  Vercel deploy              │     │  Deck / Swiss / platform ports│
└─────────────────────────────┘     └──────────────────────────────┘
              │                                    │
              └────────── migrate later ───────────┘
                    (shared schema + IDs)
```

**Copy from monorepo (read-only reference):**

- Domain rules: `packages/competition-core` (pairing, scoring, standings, format-plan)
- Shapes: `packages/competition-contracts` (entities, enums, DTOs)
- UX flows: `apps/competition-web` (organizer, wizard, roster, manual fixtures)
- OpenAPI: `openapi/competition-api.yaml` (behaviour reference, not runtime)

**Do not fork blindly** — re-implement the smallest surface in the new app; port tests
for pairing/standings from core.

---

## 3. Recommended stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Framework | **Next.js 15** App Router | Same as monorepo web |
| Hosting | **Vercel** | Root app, no separate API host |
| Database | **Supabase PostgreSQL** | Drizzle or Supabase migrations |
| Auth | **Supabase Auth** | `@supabase/ssr` cookies on server |
| Data access | Server Actions + Route Handlers | Service role for organizer mutations; RLS for reads |
| Styling | Tailwind + existing token patterns | Port from monorepo web |
| Email invites | Supabase Auth invite OR Resend | Replace dev invitation outbox |

**Explicitly out of scope for v1 standalone:**

- Separate Fastify deployable
- `@enigmic/competition-identity` JWT service
- Deck lock/reveal (C3)
- Swiss/bracket **pairing automation** (save format plan only, or hide)
- Card platform / banlist integration
- `.ics` calendar export (optional nice-to-have)

---

## 4. V1 feature scope (must ship)

### Organizer

- [ ] Sign up / sign in (Supabase Auth)
- [ ] Create competition wizard: basics → format → optional roster → review
- [ ] League formats: single RR, double RR, **manual schedule import**
- [ ] Roster: add players by name (no account required)
- [ ] Optional email invite (link Supabase user to roster row on accept)
- [ ] Generate fixtures (preview + commit, idempotent)
- [ ] Confirm fixture times, attach Twitch stream URL
- [ ] Enter / finalize / correct results (organizer)
- [ ] Rebuild standings
- [ ] Postpone / cancel fixture

### Participant (platform-linked only)

- [ ] My fixtures (fixtures where membership linked to auth user)
- [ ] Propose schedule time
- [ ] Submit result (when policy allows)

### Public

- [ ] Standings (season)
- [ ] Public calendar (confirmed fixtures only)
- [ ] Public fixture detail (confirmed+)
- [ ] Public player overview (form, H2H)

### Non-functional

- [ ] All data in Supabase (no in-memory store)
- [ ] RLS: organizers manage owned competitions; public read where visibility = public
- [ ] HTTPS-only cookies in production
- [ ] Environment validation at startup

---

## 5. Identity mapping (Supabase Auth → domain model)

The monorepo uses `customerAccountId` on memberships. For migration compatibility:

```text
customer_account_id  :=  auth.users.id   (UUID string)
```

Store a profile row:

```sql
profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
)
```

**Membership linking:**

| Mode | `memberships.customer_account_id` | `memberships.status` |
| ---- | --------------------------------- | -------------------- |
| Roster only | `NULL` | `active` |
| Platform linked | `auth.users.id` | `active` |
| Invite pending | `NULL` until accept | `active` (roster) + invitation row |

On invitation accept: set `memberships.customer_account_id = auth.uid()` where
display name matches (same rule as monorepo `auth-routes.ts`).

**Do not** use Supabase Auth metadata as the source of truth for competition roles —
always use `memberships.role` (`organizer` | `participant`).

---

## 6. Data model (Postgres)

Align table and column names with `packages/competition-db/src/schema.ts` and
`packages/competition-contracts/src/entities.ts`. Use **text IDs** with prefixes
(`comp_`, `season_`, `participant_`, …) or **UUIDs everywhere** — pick one and
document it; migration is easier if IDs match the monorepo prefix pattern.

### Core tables (required)

| Table | Purpose |
| ----- | ------- |
| `competitions` | League/tournament container |
| `seasons` | Event period |
| `rulesets` | Scoring, generation mode, tiebreakers |
| `format_plans` | Wizard output (JSON `phases`) |
| `participants` | Display names per competition |
| `memberships` | Season role, eligibility, optional `customer_account_id` |
| `rounds` | Generated schedule rounds |
| `fixtures` | Matchups, state, confirmed time |
| `schedule_proposals` | Participant time proposals |
| `matches` | 1–2 per fixture |
| `games` | Best-of-three games |
| `result_submissions` | Audit trail |
| `standings` | Disposable projection (rebuild) |
| `stream_links` | Twitch URLs |
| `season_invitations` | Email invite tokens |
| `audit_events` | Organizer actions (optional v1) |
| `idempotency_keys` | Generation commit dedup |

### Omit for v1 standalone

- `deck_submissions`
- `customer_consents` (unless you add profile settings page)

### Ruleset defaults (match monorepo)

- `matches_per_fixture`: 1
- `games_to_win_match`: 2
- Match points: win 3, draw 1, loss 0
- Tiebreakers: `["matchPoints", "headToHead", "gamesWon"]`

### Fixture lifecycle (D-046)

States: `generated` → `time_proposed` → `confirmed` → … → `finalized` | `postponed` | `cancelled`

Public calendar: **confirmed** fixtures only. Port visibility rules from
`packages/competition-core/src/state-machines.ts`.

---

## 7. Application architecture

```text
Browser
   │
   ▼
Next.js (Vercel)
   ├── Server Components (public standings, calendar)
   ├── Server Actions (organizer mutations, generation)
   ├── Route Handlers (/auth/callback, webhooks)
   └── Supabase client (@supabase/ssr)
           ├── Auth session (cookie)
           └── Postgres (RLS + service role for trusted server ops)
```

### Where business logic lives

| Logic | Location |
| ----- | -------- |
| Round-robin / manual pairing | Port `competition-core` pairing + generation (npm workspace copy or vendored files) |
| Standings rebuild | Port `competition-core` standings |
| Format plan validation | Port `competition-core` format-plan |
| Authorization | Server Actions: check membership role before mutate |
| Public reads | RLS policies + anon/authenticated Supabase client |

**Avoid** putting pairing math in SQL. Keep generation in TypeScript with tests.

### Generation flow (same as monorepo)

1. `POST` preview: compute rounds, return `preview_token` (hash of rounds + mode)
2. Store preview in `generation_previews` table (TTL 1h) or signed JWT
3. Commit with `idempotency_key` → insert rounds + fixtures in transaction

---

## 8. Migration path: standalone → post-API monorepo

**Yes, migration is feasible** if you follow these rules during standalone build.

### What migrates cleanly

| Asset | Condition |
| ----- | --------- |
| **Postgres data** | Same table/column semantics as monorepo schema |
| **User accounts** | `customer_account_id = auth.users.id` → import into `competition-identity` or keep Supabase Auth and use `IDENTITY_MODE=http` to Supabase later |
| **Fixtures, results, standings** | Direct SQL copy or pg_dump |
| **Format plans, rosters** | Direct copy |

### What needs a cutover step

| Topic | Standalone | Post-API launch |
| ----- | ---------- | --------------- |
| **Auth** | Supabase Auth | `@enigmic/competition-identity` JWT — export users or federate |
| **API layer** | Server Actions | Fastify `/v1/*` — web becomes pure BFF |
| **Business logic** | In Next.js server | `competition-core` package (already shared if you copied it) |
| **RLS** | Supabase policies | API authorization middleware — disable RLS for API role |

### Recommended migration strategy

1. **Freeze** standalone schema changes; track diffs against monorepo `competition-db`.
2. **Export** Supabase Postgres → staging RDS or monorepo target DB.
3. **Identity bridge:** one-time script: `auth.users` → identity accounts with same UUID.
4. **Deploy** competition-api against migrated DB; run monorepo test suite.
5. **Point** Vercel `COMPETITION_API_URL` at new API; replace Server Actions with BFF
   proxy (monorepo web already does this).
6. **Decommission** standalone server-side Supabase writes; keep Supabase Auth or
   switch login to identity service.

### What breaks if you ignore compatibility

- Random ID formats (auto-increment vs prefixed UUID) — hard to merge references
- Storing roles only in Supabase `app_metadata` — monorepo expects `memberships`
- Different scoring or fixture state names — standings recompute required
- Client-side Supabase writes bypassing audit — acceptable for v1, not for API era

**Bottom line:** Treat standalone DB as **the first production database**, not throwaway,
by matching the monorepo entity model from day one.

---

## 9. Supabase RLS sketch

Policies are illustrative — implement and test per table.

```sql
-- Public read confirmed fixtures for public competitions
create policy "public_fixtures" on fixtures for select using (
  exists (
    select 1 from seasons s
    join competitions c on c.id = s.competition_id
    where s.id = fixtures.season_id
      and c.visibility = 'public'
      and fixtures.state in ('confirmed', 'in_progress', 'result_pending', 'finalized')
  )
);

-- Organizer write: owner or organizer membership
-- (enforce in Server Actions with service role + explicit checks for v1 simplicity)
```

**Pragmatic v1:** use **service role** on server for all mutations; RLS for public
SELECT only. Tighten RLS before opening direct client access.

---

## 10. Environment variables

```bash
# Vercel
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only — never NEXT_PUBLIC

NEXT_PUBLIC_APP_URL=              # https://your-app.vercel.app — invite links
```

No `COMPETITION_API_URL` in standalone — there is no external API.

---

## 11. Deployment checklist

- [ ] Supabase project (EU region if aligning with D-011)
- [ ] Run migrations
- [ ] Enable Supabase Auth (email confirm policy decided)
- [ ] Vercel project linked to new repo
- [ ] Set env vars; deploy preview → smoke test
- [ ] Custom domain + HTTPS
- [ ] Disable service role exposure in client bundle (audit build)

---

## 12. Acceptance tests (automated where possible)

Port or rewrite from monorepo API tests as integration tests:

| Test | Source reference |
| ---- | ---------------- |
| Single/double round-robin generation | `packages/competition-core/src/__tests__/pairing.test.ts` |
| Manual pairings + home/away rounds | same |
| Standings after finalize + correct | `packages/competition-core/src/__tests__/standings.test.ts` |
| Public calendar excludes unconfirmed | `apps/competition-api/src/__tests__/authorization.test.ts` |
| Roster-only eligible for generation | `apps/competition-api/src/__tests__/wizard.test.ts` |
| Organizer sees all fixtures on board | authorization test |

---

## 13. Suggested repo layout (new project)

```text
standalone-competition/
├── app/                    # Next.js routes (port from competition-web)
├── components/
├── lib/
│   ├── supabase/           # server + browser clients
│   ├── domain/             # vendored or copied from competition-core
│   └── actions/            # server actions
├── supabase/
│   └── migrations/
├── tests/
├── docs/
│   └── MIGRATION.md        # link back to monorepo §8
└── package.json
```

Single package — no Turborepo required for v1.

---

## 14. Prompt starter (copy into new Cursor project)

```markdown
Build a standalone league management app per docs/standalone-launch-spec.md.

Stack: Next.js 15 App Router, Tailwind, Supabase Auth, Supabase Postgres,
Server Actions for mutations, Vercel deploy.

Reference implementation (read-only):
https://github.com/TLaw763/enigmic-competition-tools

V1 scope: §4 of the spec. Use customer_account_id = auth.users.id.
Port pairing/standings/generation from competition-core with tests.

Do not implement: decks, Swiss pairing automation, separate Fastify API.
Schema must match spec §6 for future migration to the monorepo API.

Deliver: migrations, auth flow, organizer wizard, roster, fixture generation
(auto + manual), scheduling, results, standings, public calendar.
```

---

## 15. Timeline estimate (solo, focused)

| Phase | Work | Rough effort |
| ----- | ---- | ------------- |
| A | Supabase schema + auth + profiles | 2–3 days |
| B | Organizer wizard + roster | 2–3 days |
| C | Generation + fixtures UI | 2–3 days |
| D | Results + standings | 2 days |
| E | Public pages + RLS | 1–2 days |
| F | Invites + polish + deploy | 2–3 days |

**~2–3 weeks** to production-quality v1 if domain logic is copied, not rewritten.

---

## 16. Decision log (standalone-specific)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Auth | Supabase Auth | User request; fast prod |
| API | None (Server Actions) | Vercel-only deploy |
| DB | Supabase Postgres | User request; matches D-029 dev pattern |
| ID format | Prefixed UUID strings like monorepo | Easier migration |
| Swiss/bracket | Format plan saved; generation UI hidden or “coming soon” | Avoid half-built pairing |
| Decks | Excluded | Pre-prod roadmap deferral |

---

## References

- Monorepo: https://github.com/TLaw763/enigmic-competition-tools
- Pre-prod roadmap: `docs/pre-prod-roadmap.md`
- OpenAPI behaviour: `openapi/competition-api.yaml`
- Platform hosting (long-term): [enigmic-card-platform deployment docs](https://github.com/TLaw763/enigmic-card-platform/blob/main/docs/deployment-operations.md) (Vercel web, AWS EU APIs, Supabase dev / RDS prod)
