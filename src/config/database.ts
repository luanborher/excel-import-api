import type { Env } from './env.js';

export type SqlServerConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

export function resolveSqlServerConfig(env: Env): SqlServerConfig | null {
  const host = env.SQL_SERVER_HOST?.trim();
  if (!host) {
    return null;
  }

  return {
    host,
    port: env.SQL_SERVER_PORT,
    database: env.SQL_SERVER_DATABASE!.trim(),
    user: env.SQL_SERVER_USER!.trim(),
    password: env.SQL_SERVER_PASSWORD!,
  };
}
