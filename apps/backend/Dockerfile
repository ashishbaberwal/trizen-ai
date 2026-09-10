# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json ./
RUN npm install --ignore-scripts

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
# tsc emits ESM that keeps the package.json "type": "module" semantics;
# strip .js extensions handling is unnecessary — NodeNext resolves as-is.
RUN npx tsc

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Runtime package.json without "type": "module" — compiled output is CJS here.
# Simpler: emit CJS from tsc by overriding module at build time.
COPY package.json ./package.json.tmp
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('./package.json.tmp','utf8'));delete p.type;fs.writeFileSync('./package.json',JSON.stringify(p,null,2));fs.unlinkSync('./package.json.tmp');"
USER app
EXPOSE 4000
CMD ["node", "dist/server.js"]
