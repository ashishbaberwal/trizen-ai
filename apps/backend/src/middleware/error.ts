import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Final error handler. Logs details server-side, returns a safe message to
 * the client — internals never leak into responses.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("Unhandled error:", err instanceof Error ? err.message : err);
  res.status(500).json({ error: "Internal server error" });
}

/** 404 catch-all for unmatched routes. */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}
