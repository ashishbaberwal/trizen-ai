# CLAUDE.md

**Read `AGENTS.md` first** — it has the full architecture, commands, and rules.
This file is the short version.

## Architecture (fixed — do not change)

- Turborepo, Bun workspace. Frontend: `apps/frontend` (Next.js 16, :3000).
  Backend: `apps/backend` (Express 5 + TS, :4000).
- **Clerk** = auth. **Supabase** = PostgreSQL only. **Appwrite** = photo storage only.
- Never: Supabase Auth, Supabase Storage, NextAuth, custom JWT, S3 (unless
  explicitly approved), backend logic inside Next.js route handlers.
- Never containerize Clerk/Supabase/Appwrite — only frontend and backend.

## Ground Rules

- Do not redesign the existing frontend UI; modify only what integration requires.
- Identity comes only from verified Clerk tokens (`requireAuth`); never trust
  client-sent user IDs. `await auth()` — it is async.
- Secrets stay out of Git, logs, and `NEXT_PUBLIC_*`. If a value is missing, ask.
- Use Clerk/Supabase/Appwrite CLI + MCP when appropriate — but **stop and ask
  before any destructive remote operation** (resets, deletions, prod changes).
- Preserve Turborepo; keep frontend/backend separate; ask before major
  architecture changes.
- Next.js 16: use `proxy.ts` (not `middleware.ts`); Clerk Core 3 uses `<Show>`,
  not `SignedIn`/`SignedOut`.

## Before You Finish

Run `lint`, `check-types`, `build` (and backend `test` if backend changed).
Commit in small Conventional Commits. Report failures honestly.
