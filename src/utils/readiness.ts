import type { Env } from '../config/index.js';
import { resolveSqlServerConfig } from '../config/index.js';
import { pingSqlServer } from '../database/sql.js';

export type DependencyStatus = 'ok' | 'down' | 'not_configured';

export type ReadinessResult = {
  status: 'ok' | 'unavailable';
  checks: {
    sqlServer: DependencyStatus;
  };
};

export type ReadinessChecker = () => Promise<ReadinessResult>;

export function createReadinessChecker(env: Env): ReadinessChecker {
  return async () => getReadinessStatus(env);
}

export async function getReadinessStatus(env: Env): Promise<ReadinessResult> {
  const sqlConfig = resolveSqlServerConfig(env);

  let sqlServer: DependencyStatus = 'not_configured';
  if (sqlConfig) {
    const isUp = await pingSqlServer(sqlConfig);
    sqlServer = isUp ? 'ok' : 'down';
  }

  const status = sqlServer === 'down' ? 'unavailable' : 'ok';

  return {
    status,
    checks: { sqlServer },
  };
}
