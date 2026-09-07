# backend

Express + TypeScript API for FrameFlow (TrizenAI photo sharing platform).

## Development

```sh
bun install
bun run dev        # tsx watch, port 4000
```

Environment is validated at boot — see `.env.example` for required variables.

## Scripts

| Script             | Purpose                        |
| ------------------ | ------------------------------ |
| `dev`              | Watch-mode dev server (tsx)    |
| `build`            | Compile to `dist/` (tsc)       |
| `start`            | Run compiled output            |
| `test`             | Vitest                         |
| `lint` / `check-types` | ESLint / tsc --noEmit      |

## API

| Endpoint             | Auth            | Description                                      |
| -------------------- | --------------- | ------------------------------------------------ |
| `GET /health`        | public          | Liveness probe                                   |
| `GET /api/v1/health` | public          | Liveness + database connectivity                 |
| `GET /api/v1/me`     | Clerk bearer    | Verified identity + app role (JIT-upserts user)  |
| `GET /api/v1/admin/ping` | ADMIN role  | Authorization foundation smoke endpoint          |

## Notes

- Identity comes only from verified Clerk tokens (Authorization: Bearer).
- Roles live in Postgres; role checks are DB-backed.
- Appwrite Storage client is server-side only; the API key never leaves the backend.
