import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().default(3000),
    SQL_SERVER_HOST: z.string().optional(),
    SQL_SERVER_PORT: z.coerce.number().int().positive().default(1433),
    SQL_SERVER_DATABASE: z.string().optional(),
    SQL_SERVER_USER: z.string().optional(),
    SQL_SERVER_PASSWORD: z.string().optional(),
    IMPORT_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().max(50).default(10),
  })
  .superRefine((data, ctx) => {
    const host = data.SQL_SERVER_HOST?.trim();
    if (!host) {
      return;
    }

    const missing: string[] = [];
    if (!data.SQL_SERVER_DATABASE?.trim()) {
      missing.push('SQL_SERVER_DATABASE');
    }
    if (!data.SQL_SERVER_USER?.trim()) {
      missing.push('SQL_SERVER_USER');
    }
    if (!data.SQL_SERVER_PASSWORD) {
      missing.push('SQL_SERVER_PASSWORD');
    }

    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `SQL Server parcialmente configurado. Defina também: ${missing.join(', ')}`,
        path: ['SQL_SERVER_HOST'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment configuration: ${JSON.stringify(details)}`);
  }

  return parsed.data;
}

export function getImportMaxFileSizeBytes(env: Env): number {
  return env.IMPORT_MAX_FILE_SIZE_MB * 1024 * 1024;
}
