import { describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../src/server.js";
import { resetEnvCache } from "../src/config/env.js";

function buildApp() {
  process.env.NODE_ENV = "test";
  process.env.PORT = process.env.PORT && process.env.PORT !== "0" ? process.env.PORT : "4000";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";
  process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? "sk_test_placeholder";
  process.env.APPWRITE_ENDPOINT =
    process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
  process.env.APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "test-project";
  process.env.APPWRITE_API_KEY = process.env.APPWRITE_API_KEY ?? "test-key";
  process.env.APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID ?? "test-bucket";
  resetEnvCache();
  return createApp();
}

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await request(buildApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/v1/health", () => {
  it("returns 200 ok when the database is reachable", async () => {
    const res = await request(buildApp()).get("/api/v1/health");
    // The CI/local test run may not have a database; accept ok or degraded
    // but the endpoint must respond 200/503 (never 401/404/500).
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toEqual({ status: "ok" });
    }
  });

  it("is public (no Authorization header required)", async () => {
    const res = await request(buildApp()).get("/api/v1/health");
    expect(res.status).not.toBe(401);
  });
});

describe("GET /api/v1/me", () => {
  it("returns 401 without an Authorization header", async () => {
    const res = await request(buildApp()).get("/api/v1/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 with a garbage bearer token", async () => {
    const res = await request(buildApp())
      .get("/api/v1/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/me with valid Clerk authentication", () => {
  it("returns the verified identity when a real Clerk token is provided", async () => {
    // This test is skipped unless real Clerk env vars are present. It requires
    // a genuine Clerk session token — never fabricate one in source.
    if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
        process.env.CLERK_SECRET_KEY === "sk_test_placeholder") {
      console.warn("Skipping live Clerk test — set real CLERK_SECRET_KEY to enable");
      return;
    }
    const token = process.env.CLERK_TEST_TOKEN;
    if (!token) {
      console.warn("Skipping live Clerk test — set CLERK_TEST_TOKEN to enable");
      return;
    }
    const res = await request(buildApp()).get("/api/v1/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.email).toContain("@");
  });
});
