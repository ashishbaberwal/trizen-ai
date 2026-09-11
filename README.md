# FrameFlow (trizen-ai)

A photography / event-team platform: admins create events and manage team
members, team members upload photos, and customers open published,
PIN-protected galleries through a shareable link.

## Monorepo layout

```
apps/
  frontend/    Next.js 16 (App Router) + Tailwind 4 + shadcn-style UI  → :3000
  backend/     Express 5 + TypeScript API                              → :4000
packages/      Shared eslint / tsconfig / ui scaffolding
supabase/      Version-controlled SQL migrations (PostgreSQL schema)
```

Architecture rules, service boundaries, and security requirements live in
[AGENTS.md](AGENTS.md) — read it before changing anything.

```
Browser → Next.js (:3000) → Express (:4000)
                              ├── Clerk    → auth (identity, sessions)
                              ├── Supabase → PostgreSQL (metadata only)
                              └── Appwrite → photo storage (binaries only)
```

## Getting started

Requires **Bun** and Node ≥ 24. Copy the `.env.example` files to
`.env.local` in both apps and fill in the Clerk / Supabase / Appwrite values.

```sh
bun install

bun run dev --filter=frontend   # Next.js on :3000
bun run dev --filter=backend    # Express on :4000 (tsx watch)
```

## Checks

```sh
bun run lint          # ESLint everywhere (turbo)
bun run check-types   # tsc --noEmit everywhere
bun run build         # production build everywhere
bun run test          # backend vitest suite

cd apps/backend && TEST_DATABASE_URL=postgres://… bun run test
```

The backend test suites hit a real Postgres (Clerk and Appwrite are mocked);
without `TEST_DATABASE_URL` the database-backed suites are skipped. To run
them locally, create an empty database, apply the files in
`supabase/migrations/`, and point `TEST_DATABASE_URL` at it.
