# Migration to enigmic-competition-tools

This standalone app is designed for forward migration to the monorepo Fastify API.

See [standalone-launch-spec.md](./standalone-launch-spec.md) §8 for the full strategy.

## Compatibility guarantees

- `customer_account_id` = `auth.users.id` (UUID)
- Prefixed IDs (`comp_`, `season_`, `participant_`, …)
- Same table/column semantics as `packages/competition-db`
- Domain logic vendored from `packages/competition-core`

## Cutover steps

1. Freeze schema; diff against monorepo `competition-db`
2. Export Supabase Postgres → target RDS
3. Bridge identity: `auth.users` → competition-identity accounts (same UUID)
4. Deploy `competition-api`; point Vercel at API URL
5. Replace Server Actions with BFF proxy (see monorepo `competition-web`)
