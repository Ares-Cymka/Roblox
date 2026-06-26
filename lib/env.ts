import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),
  REDIS_URL: z
    .string()
    .min(1, "REDIS_URL is required")
    .refine(
      (value) => value.startsWith("redis://") || value.startsWith("rediss://"),
      "REDIS_URL must be a Redis connection string"
    ),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().optional().transform((v) => v?.trim() || undefined),
  STRIPE_WEBHOOK_SECRET: z.string().optional().transform((v) => v?.trim() || undefined),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().transform((v) => v?.trim() || undefined),
  DELIVERY_ADAPTER: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.enum(["mock", "manual", "auto"]))
    .default("manual"),
  DELIVERY_CONCURRENCY: z.coerce.number().int().positive().default(5),
  // How long the mock adapter waits before marking delivered (ms). Default 3000ms.
  BOT_MOCK_DELAY_MS: z.coerce.number().int().nonnegative().default(3000),
  // Shared secret used to authenticate external bot callbacks and heartbeats.
  BOT_API_SECRET: z.string().optional().transform((v) => v?.trim() || undefined),
  // Roblox private server invite for the MM2 delivery bot (seed/admin sync).
  BOT_PRIVATE_SERVER_URL: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .refine(
      (v) => !v || v.startsWith("http://") || v.startsWith("https://"),
      "BOT_PRIVATE_SERVER_URL must be a valid URL"
    ),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnvSafe(): Env | null {
  const parsed = envSchema.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}
