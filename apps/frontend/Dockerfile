# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# bun.lock lives at the repo root (outside this build context), so install
# from package.json only. Swap for a full monorepo context if you need
# frozen lockfile installs.
COPY package.json ./
RUN bun install

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app 2>/dev/null; adduser -S app -G app 2>/dev/null || true
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["bun", "x", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
