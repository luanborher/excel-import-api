import sql from 'mssql';

import type { SqlServerConfig } from '../config/index.js';

export function toSqlServerConnectionConfig(config: SqlServerConfig): sql.config {
  return {
    server: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    connectionTimeout: 5_000,
    requestTimeout: 30_000,
  };
}

let cachedPool: sql.ConnectionPool | null = null;
let cachedConfigKey: string | null = null;

function configKey(config: SqlServerConfig): string {
  return `${config.host}:${String(config.port)}:${config.database}:${config.user}`;
}

export async function getSqlServerPool(config: SqlServerConfig): Promise<sql.ConnectionPool> {
  const key = configKey(config);

  if (cachedPool?.connected && cachedConfigKey === key) {
    return cachedPool;
  }

  if (cachedPool) {
    await cachedPool.close();
    cachedPool = null;
    cachedConfigKey = null;
  }

  const pool = new sql.ConnectionPool(toSqlServerConnectionConfig(config));
  await pool.connect();
  cachedPool = pool;
  cachedConfigKey = key;

  return pool;
}

export async function closeSqlServerPool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.close();
    cachedPool = null;
    cachedConfigKey = null;
  }
}

export async function pingSqlServer(config: SqlServerConfig): Promise<boolean> {
  const pool = new sql.ConnectionPool(toSqlServerConnectionConfig(config));

  try {
    await pool.connect();
    await pool.request().query('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  } finally {
    await pool.close();
  }
}

export const IMPORT_UNIFIED_TABLE = 'import_unified';

export const CREATE_IMPORT_UNIFIED_TABLE_SQL = `
IF OBJECT_ID(N'dbo.${IMPORT_UNIFIED_TABLE}', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.${IMPORT_UNIFIED_TABLE} (
    import_batch_id UNIQUEIDENTIFIER NOT NULL,
    pedido_id INT NOT NULL,
    cliente_id INT NOT NULL,
    valor DECIMAL(18, 2) NOT NULL,
    cliente_nome NVARCHAR(255) NOT NULL,
    cliente_email NVARCHAR(255) NULL,
    imported_at DATETIME2 NOT NULL CONSTRAINT DF_${IMPORT_UNIFIED_TABLE}_imported_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_${IMPORT_UNIFIED_TABLE} PRIMARY KEY (import_batch_id, pedido_id)
  );
END;
`;
