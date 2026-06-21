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
  DELIVERY_ADAPTER: z.enum(["mock"]).default("mock"),
  DELIVERY_CONCURRENCY: z.coerce.number().int().positive().default(5),
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
