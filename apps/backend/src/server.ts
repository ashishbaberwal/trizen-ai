import compression from "compression";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

import { loadEnv } from "./config/env.js";
import { closePool } from "./lib/db.js";
import { checkBucket } from "./lib/storage.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requireAuth } from "./middleware/auth.js";
import { createApiRouter } from "./routes/api.js";

export function createApp() {
  const env = loadEnv();

  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      // Credentials stay disabled — auth is via Authorization header only.
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  const requireAuthMiddleware = requireAuth(env);
  app.use("/api/v1", (req: Request, res: Response, next: NextFunction) => {
    // Public routes within /api/v1 skip authentication.
    if (req.path === "/health") {
      next();
      return;
    }
    requireAuthMiddleware(req as never, res, next);
  });

  app.use("/api/v1", createApiRouter({ env }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function start() {
  const env = loadEnv();

  // Fail fast if the storage bucket is misconfigured (404 probe is fine).
  const bucketOk = await checkBucket(env);
  if (!bucketOk) {
    console.error("Appwrite bucket check failed — check APPWRITE_* configuration");
    process.exitCode = 1;
    return null;
  }

  const app = createApp();
  const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Backend listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown — stop accepting, drain, then close the DB pool.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down…`);
    server.close(() => {
      closePool()
        .catch(() => undefined)
        .finally(() => process.exit(0));
    });
    // Force-exit if draining hangs (e.g. keep-alive connections).
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return server;
}

// Only boot when run directly (tests import createApp instead).
if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  void start();
}
