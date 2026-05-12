import { z } from "zod";

const envSchema = z.object({
  PORT: z.string(),
  CLIENT: z.string(),
  DATABASE_URL: z.string(),
  CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  ADMIN_EMAILS: z.string().optional().default(""),
  VALKEY_URL: z.string().optional().default("redis://localhost:6379"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
