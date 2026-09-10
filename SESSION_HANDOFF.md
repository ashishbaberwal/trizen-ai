# SESSION_HANDOFF.md — FrameFlow (TrizenAI Photo Sharing Platform)

> Read this FIRST in a fresh session. Complements `AGENTS.md` (architecture/rules)
> and `CLAUDE.md`. Reflects state as of 2026-09-10 (evening).

## 1. Project Overview

Photography/event-team platform "FrameFlow" — Turborepo + Bun monorepo.

- **Frontend**: `apps/frontend` — Next.js 16.3.4 (App Router, Turbopack, `proxy.ts` NOT `middleware.ts`), Tailwind 4, Radix/shadcn-style `components/ui/`, Clerk Core 3 (`@clerk/nextjs@7.9.1`)
- **Backend**: `apps/backend` — Express 5 + TypeScript, port 4000, vitest, multer, node-appwrite, pg
- **Services**: Clerk (auth only), Supabase Postgres `vyaqbytpjmgvtawezcyu` (all app data), Appwrite (photo binaries only)
- **Package manager**: Bun (`bun.lock` at root). Never add a second lockfile.

## 2. Current Architecture (implemented and working)

```
users ──▶ workspaces (each independent signup = ADMIN of own workspace)
events ──▶ workspaces
event_team_members (composite PK event_id+user_id) — relationship-based access
photos (metadata; binary in Appwrite) ──▶ events
galleries (event FK, unique slug, 6-digit PIN server-generated, draft/published)
gallery_photos (join, composite PK)
invitations (email, workspace_id, invited_by, status, clerk_invitation_id)
```

### Multi-tenant rules (enforced in backend, tested)
- Self-signup → new workspace + role ADMIN (product decision, user requested this).
- Invited member → joins inviter's workspace as TEAM_MEMBER via `invitations` row +
  Clerk invitation `publicMetadata.role = 'TEAM_MEMBER'` (read server-side in `requireAuth`).
- No pending invitation row on first sign-in → safe fallback: own workspace as ADMIN
  (never invent a membership).
- `users.clerk_user_id` is the stable identity. `upsertUserFromClerk` never overwrites
  role/workspace on repeat sign-ins; it also ADOPTS a `pending:<email>` placeholder row
  (moves event memberships, deletes placeholder).
- Pending invite rows use `clerk_user_id = 'pending:<email>'` placeholder.
- All event/photo/gallery queries go through `getWorkspaceEvent()` — cross-workspace IDs
  are 404-invisible. Team members additionally need an `event_team_members` row (403).

## 3. Migrations (all applied to remote Supabase via MCP — canonical system is
`supabase/migrations/`, no Prisma)

| File | Contents |
|---|---|
| `20260908000000_foundation_users.sql` | users table, user_role enum, updated_at trigger, RLS |
| `20260909000000_events_and_team.sql` | events, event_team_members |
| `20260909010000_multi_tenant_workspaces.sql` | workspaces, users.workspace_id NOT NULL, events.workspace_id NOT NULL, invitations table |
| `20260909020000_photos.sql` | photos metadata table (storage_file_id UNIQUE, no binary) |
| `20260909030000_galleries.sql` | galleries, gallery_photos |

Existing-data backfill note: pre-migration users were assigned per ADMIN; one orphan
test row (empty email, `clerk_outsider_1`) was later deleted.

## 4. Backend API (`/api/v1`, all errors `{ "error": "..." }`)

- `GET /health` (public), `GET /api/v1/health` (DB check, 503 when down)
- `GET /api/v1/me` — JIT-upserts user, returns `{id, email, name, role}`
- `GET /team-members`, `POST /team-members/invite`, `PATCH /team-members/:id/role`
  (self-change blocked, last-admin demotion 409), `DELETE /team-members/:id` — ADMIN only
- `GET /events` (admin: workspace events; member: assigned only), `POST /events` (ADMIN),
  `GET/PATCH/DELETE /events/:id`
- `GET/POST /events/:id/team-members`, `DELETE /events/:id/team-members/:userId` (ADMIN)
- `POST /events/:eventId/photos` — multipart, field name `photos`, max 20 files,
  25 MB each, MIME allowlist jpeg/png/webp, multer memory storage; uploads binary to
  Appwrite with `randomUUID()` storage key, then Postgres metadata; cleans up Appwrite
  object if metadata insert fails; `uploaded_by` ALWAYS server-derived (spoof test exists)
- `GET /events/:eventId/photos`, `DELETE /photos/:photoId` (ADMIN, workspace-scoped)
- `POST /events/:id/galleries` (ADMIN; validates photo_ids belong to event in SQL →
  400 cross-event; crypto-random PIN `randomInt(0,1e6).padStart(6,'0')`; unique slug)
- `GET /events/:id/galleries` (members can view), `POST /galleries/:id/publish` (ADMIN)

Key backend files: `src/lib/db.ts` (all queries + workspace helpers), `src/lib/storage.ts`
(Appwrite client, `uploadPhoto`, `deletePhotoQuietly`, `photoUrl`, `ALLOWED_MIME_TYPES`,
`MAX_PHOTO_BYTES=25MB`), `src/middleware/auth.ts` (`requireAuth` verifyToken + `invitedRole`
from publicMetadata, `requireRole` reads role from Postgres), `src/middleware/upload.ts`,
`src/middleware/error.ts` (`HttpError`), `src/routes/api.ts` (all routes + serializers),
`src/lib/clerk.ts` (shared client for invitations).

### 4a. NEW this session: derived fields added to serializers
- `serializeEvent` now returns **`photo_count`** (COUNT over photos, selected in SQL via a
  shared `EVENT_COLUMNS` fragment in `db.ts`). Derived, never stored → cannot drift.
- `serializePhoto` now returns **`uploader_name`** and **`uploader_role`**, joined from
  `users`. The name falls back to email via `COALESCE(NULLIF(u.name,''), u.email)` because
  accounts created without a display name store `name` as `''`.
- `insertPhoto` returns the same attribution via a CTE so the upload response renders
  immediately without a second round trip.

## 5. Frontend

- `src/lib/api/client.ts` — centralized client, `NEXT_PUBLIC_API_URL`, `apiFetch` with
  Bearer token; `uploadPhotos()` uses XHR for real progress + 120s timeout; typed
  `TeamMemberApi`, `EventApi`, `PhotoApi`, `InvitationApi`, `GalleryApi`
  - **`getSessionToken(getToken)`** — bounded (15s) token fetch, retries once with
    `skipCache`, then throws an actionable error. Never hangs forever.
  - **`uploadPhotosWithRetry(getToken, ...)`** — refreshes the token and retries the batch
    once on 401/403 (`UnauthorizedError`). Dev-instance tokens live ~60s.
  - **`toPhoto()` / `toGallery()` / `toTeamMember()`** — the single API→UI mappers. Pages
    must use these; duplicating the mapping is how the old hardcoded bugs survived.
- `src/lib/api/use-current-user.ts` — `useCurrentUserState()` fetches role from `/me`;
  on backend failure falls back to member-safe UI. UI role checks are UX-only.
- Role-aware nav: admin = Overview/Events/Galleries/Team; member = My Events only.
  `sidebar-inner.tsx` shared. `/dashboard/team` shows deliberate access-denied for members.
- `proxy.ts` is at `apps/frontend/src/proxy.ts` (MUST be inside src/ — Next 16 requirement,
  was silently dead at repo root before). `createRouteMatcher(["/dashboard(.*)"])` + `auth.protect()`.
  NOTE: Clerk deprecation warning about `createRouteMatcher` in logs is expected; migration to
  per-page checks is optional future work.
- Clerk routes are `/login` and `/register` (catch-all `[[...rest]]` pages render `<SignIn>`/`<SignUp>`)
  and `.env.local` MUST have `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`, `..._SIGN_UP_URL=/register`.
  Fallback redirects = `/dashboard`.
- `ClerkProvider` inside `<body>` in `layout.tsx`.
- Photo grid: admin-only selection UI; members get click-to-zoom; `next.config.ts` allows
  `*.appwrite.io` + `syd.cloud.appwrite.io` image hostnames.

### 5a. Event page now fully API-backed (was the big fix this session)
`/dashboard/events/[eventId]` previously read team members AND galleries from an in-memory
mock store (`lib/services.ts`), so created galleries never appeared and counts were empty.
Now:
- Event + photos + **team members** (`listEventMembers`) + **galleries** (`listEventGalleries`)
  all come from the real API in one `Promise.all`.
- Photos tab renders the event's **photo grid inline** (used to be just a link elsewhere).
- Galleries tab lists every gallery with real photo count, publish date, **PIN**, and
  **public link** + copy buttons.
- "Create gallery" opens `CreateGalleryWizard` **on this page**; `onPublished` refetches.
- `onUploaded` and `onInvited` refetch in place (no more `window.location.reload()`).
- The duplicate "Upload photos" button in the page **header was removed** — the actions row
  below the banner is the single entry point.
- "Manage team" (`add-member-modal`) now calls the real `POST /team-members/invite`
  (it used to toast success while writing to the mock store).

## 6. Appwrite

- Current project: **`frameflow-edu`** in "GitHub Student Organization" org, region syd.
- Bucket: **`photos`** (id literally `photos`) — jpg/jpeg/png/webp, **50 MB** max,
  encryption+antivirus+transformations on, `fileSecurity: false`.
- **Permissions currently `read/create/update/delete("any")`** — see §13 warning.
- Backend env (`apps/backend/.env.local`, gitignored):
  `APPWRITE_ENDPOINT=https://syd.cloud.appwrite.io/v1`, `APPWRITE_PROJECT_ID=frameflow-edu`,
  `APPWRITE_API_KEY=standard_0146b9…` (scopes: buckets.read, files.read, files.write),
  `APPWRITE_BUCKET_ID=photos`.
- Frontend never sees the API key and never talks to Appwrite directly (verified: 0 APPWRITE
  vars in `apps/frontend/.env.local`, no SDK import).
- **Server API keys bypass bucket permissions**, which is why uploads work regardless of the
  permission list. `storage_update_bucket` RESETS omitted fields to defaults — always pass
  `name`, `maximum_file_size`, `allowed_file_extensions`, and `permissions` together.

## 7. Tests — 40/40 passing

Run with: `TEST_DATABASE_URL=$(grep -o 'postgresql://[^ ]*' .env.local | head -1) bun run test`
(from `apps/backend`).

- `tests/api.test.ts` (6) — foundation health/auth
- `tests/authorization.test.ts` (15) — role gates, invite dedup, workspace isolation
- `tests/photos.test.ts` (10) — upload, spoofed uploaded_by, cross-workspace matrix,
  MIME rejection, admin view/delete
- `tests/galleries.test.ts` (9) — create+PIN, cross-event photo rejection, member 403, publish

vitest `fileParallelism: false`, `testTimeout: 20000`. Tests mock `@clerk/backend` verifyToken
(pattern `valid.<clerkUserId>`) and `src/lib/storage.js`.
**Known flake**: the teardown of `authorization`/`galleries` can race on the shared seeded
workspace (`users_workspace_id_fkey`) after all tests already passed. Re-run clears it.

## 8. RESOLVED BUGS this session (all verified end-to-end)

1. **Upload stuck at 0%, backend logging zero requests.** Root cause: in `upload-modal.tsx`,
   `const uploading = items.some(i => i.status === "uploading" || i.status === "queued")`.
   Files enqueue as `"queued"`, so attaching a file disabled the only button that calls
   `startUpload()` and relabelled it "Uploading…". Fixed by counting only `"uploading"` and
   deriving button state from the pending count. Also fixed `retry()` reading stale state.
2. **Clerk "infinite redirect loop / keys do not match".** Not a key mismatch — all env files
   use the same instance (`lasting-lobster-756`), keys hash-match, JWKS resolves 200. The
   message is Clerk's *generic* text emitted when its redirect-loop guard trips (3 handshake
   hops inside a 2-second window). Cause: a `__session` cookie whose JWT doesn't belong to the
   configured instance (observed: both suffixed `__client_uat_MkW2b5Ab` and unsuffixed
   `__client_uat` cookies set to `0`, `__clerk_db_jwt` present, no valid session). Remedy is
   browser-side: clear site data for localhost:3000 and sign in fresh. Verified live.
3. **Photo count always 0 / uploader always "Team member".** Hardcoded placeholders in 3
   pages plus no count in the API. Fixed via §4a + `toPhoto()`.
4. **Event page photos invisible.** Its Photos tab was an empty state + link; the grid lived
   at a different route. Now inline.
5. **Galleries never appeared.** Event page read a mock store. Now real API (§5a).
6. **Nested `<a>` hydration error on /login** — `AuthSplit` wrapped `Logo` (which renders its
   own anchor) in a `<Link>`. Fixed; verified 0 console errors.
7. **Unsplash 404s** through the `next/image` proxy — `photo-1450388940901-…` returns 404.
   Replaced with `photo-1519741497674-…` (200).

## 9. STILL MOCK-BACKED (known gap — do not mistake for working)

- **`/gallery/[slug]` (public customer gallery page)** — uses `galleryService` from
  `lib/services.ts`. `verifyPin()` compares against an in-memory store, so it **accepts any
  PIN** against mock data. There is **no public gallery API endpoint** in the backend
  (`grep public/galleries` → nothing). This is the next real phase AND a security item.
  Needed: `GET /api/v1/public/galleries/:slug` + real PIN verification, rate limiting,
  published-only, only `gallery_photos` photos, no workspace/team leakage.
- **`/dashboard` overview** — `dashboardService` + `eventService` from `lib/services.ts`
  (stats, recent activity, upload chart are mock). Event list is real via `api.listEvents`.
- `lib/services.ts` is the mock module; `lib/mock-data.ts` backs it.

## 10. Environment

- `apps/backend/.env.local`: CLERK_SECRET_KEY, DATABASE_URL (pooler, ap-northeast-1,
  password embedded), DATABASE_SSL_CA=`…/apps/backend/prod-ca-2021.crt` (required — TLS:
  CA set → full verify; unset in dev → relaxed with warning; unset in prod → refuse boot),
  APPWRITE_* (§6).
- `apps/frontend/.env.local`: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, NEXT_PUBLIC_API_URL=http://localhost:4000,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login, NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register,
  fallback redirect URLs=/dashboard.
- NOTE: `.env.local` files are gitignored, so a fresh `git worktree` does NOT have them —
  copy from the main checkout before running dev/tests.
- Never print secret values; `.env.example` files contain names only.

## 11. Git

- Main checkout `main` is **22+ commits ahead of origin/main** and has uncommitted work.
  It has NOT been pushed.
- Work this session lives on branch **`fix/upload-working`** (worktree
  `.claude/worktrees/upload-fix-main`), 8 commits, pushed:
  - `ce877ad` upload survives expiring session
  - `f4c7952` nested anchor + cover images
  - `d1559e9` **enable the Upload button (the actual upload fix)**
  - `c6c9373` API returns photo counts + uploader attribution
  - `4ccc4b4` real counts + correct uploader attribution
  - `15527a7` centralise photo mapping, drop dead nav link
  - `813ba6c` **sync galleries and team to the real API**
  - `79a8d5d` real invitations from the Manage team modal
- PR: **https://github.com/ashishbaberwal/trizen-ai/pull/2** (draft).
- Earlier branch `fix/upload-auth-session-recovery` (PR #1) is superseded by #2.
- Untracked: `.mcp.json`, `.playwright-cli/`, `SESSION_HANDOFF.md`,
  `apps/backend/scripts/diag-*.cjs`.
- Commit style: small Conventional Commits with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.

## 12. Gotchas

- Backend must be running for ANY authed frontend API call; "Failed to fetch" = backend down.
  Health check: `curl localhost:4000/health`.
- **Only one `next dev` per project directory** — a second prints "Another next dev server is
  already running" and exits. Kill the first (`kill <pid>`) before starting on another port.
- **Old servers keep owning ports.** Before testing changes, confirm the process on the port
  is the one you started (`lsof -nP -iTCP:4000 -sTCP:LISTEN`). A stale backend from another
  checkout silently served old code during this session and produced `undefined` fields.
- Start everything with `bun run dev` from repo root.
- Supabase MCP `execute_sql` connects as a limited role — RLS-protected writes may need the
  user's dashboard/psql.
- Supabase pooler host region is `aws-0-ap-northeast-1`.
- Clerk dev-instance console warning about development keys is expected — do not suppress.

## 13. SECURITY / CLEANUP ITEMS (please review)

1. **Appwrite bucket permissions are too broad.** Changed to
   `read/create/update/delete("any")` at the user's explicit request, but it is unnecessary:
   the backend authenticates with an API key, which bypasses bucket permissions entirely, so
   uploads worked before the change. Project ID is public in every photo URL
   (`?project=frameflow-edu`), so `create("any")` lets anyone upload into the bucket.
   **Recommend reverting to `["read(\"any\")"]`.** While applying this change I accidentally
   reset `maximumFileSize` (50 MB → 5 GB) and the extension allowlist (→ empty); both were
   restored and verified. Lesson: `storage_update_bucket` defaults omitted fields.
2. A demo/test Clerk user `admin@demo.com` (`user_3J3ZoeeJNcGitmZLCK4jTroxB7n`) had its
   password set for local browser testing. It is an ADMIN of its own workspace with no events.
   Disable or delete if unwanted.
3. Pre-existing hydration error remains: a `<p>` containing a `<div>` skeleton in the
   loading/empty state. Harmless but noisy; not upload-related.

## 14. Remaining Phase Work

1. **Customer gallery flow** — the real phase, incl. the security gap in §9.
2. Dashboard overview real wiring (stats/activity/chart).
3. Demo data seed (idempotent): 3 events, 2–3 members, 10–20 real Appwrite images.
4. Unpublish API (UI currently shows "arrives later" toast honestly).
5. UI polish pass (Motion etc.) per original master task.
6. Optional: migrate away from deprecated `createRouteMatcher`.
