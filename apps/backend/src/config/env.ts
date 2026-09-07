import { z } from "zod";

/**
 * Environment validation — the server refuses to boot with a broken config.
 * Values are parsed, never logged.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLERK_SECRET_KEY: z
    .string()
    .min(1, "CLERK_SECRET_KEY is required")
    .refine((v) => v.startsWith("sk_"), "CLERK_SECRET_KEY must start with sk_"),
  APPWRITE_ENDPOINT: z.string().url("APPWRITE_ENDPOINT must be a valid URL"),
  APPWRITE_PROJECT_ID: z.string().min(1, "APPWRITE_PROJECT_ID is required"),
  APPWRITE_API_KEY: z.string().min(1, "APPWRITE_API_KEY is required"),
  APPWRITE_BUCKET_ID: z.string().min(1, "APPWRITE_BUCKET_ID is required"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    // Only field names/messages go to stderr — never raw values.
    console.error(`Invalid environment configuration → ${missing}`);
    throw new Error("Environment validation failed");
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: clears the cached env so a new one is parsed. */
export function resetEnvCache(): void {
  cached = null;
}
