import sql from 'mssql';

import type { SqlServerConfig } from '../config/index.js';
import { getErrorMessage } from '../errors/AppError.js';
import { SqlPersistenceError } from '../errors/SqlPersistenceError.js';
import { getSqlServerPool } from './sql.js';
import { migrations } from './migrations/index.js';

export type Migration = {
  version: string;
  name: string;
  sql: string;
};

export type RunMigrationsResult = {
  applied: string[];
  skipped: string[];
};

const SCHEMA_MIGRATIONS_TABLE = 'schema_migrations';

const CREATE_SCHEMA_MIGRATIONS_TABLE_SQL = `
IF OBJECT_ID(N'dbo.${SCHEMA_MIGRATIONS_TABLE}', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.${SCHEMA_MIGRATIONS_TABLE} (
    version NVARCHAR(32) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    applied_at DATETIME2 NOT NULL CONSTRAINT DF_${SCHEMA_MIGRATIONS_TABLE}_applied_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_${SCHEMA_MIGRATIONS_TABLE} PRIMARY KEY (version)
  );
END;
`;

export async function runMigrations(config: SqlServerConfig): Promise<RunMigrationsResult> {
  const pool = await getSqlServerPool(config);

  try {
    await pool.request().query(CREATE_SCHEMA_MIGRATIONS_TABLE_SQL);

    const appliedVersions = await loadAppliedVersions(pool);
    const result: RunMigrationsResult = { applied: [], skipped: [] };

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        result.skipped.push(migration.version);
        continue;
      }

      await applyMigration(pool, migration);
      result.applied.push(migration.version);
    }

    return result;
  } catch (error) {
    throw new SqlPersistenceError('Falha ao executar migrations do banco de dados', {
      cause: getErrorMessage(error),
    });
  }
}

async function loadAppliedVersions(pool: sql.ConnectionPool): Promise<Set<string>> {
  const result = await pool.request().query<{ version: string }>(`
    SELECT version
    FROM dbo.${SCHEMA_MIGRATIONS_TABLE}
    ORDER BY version;
  `);

  return new Set(result.recordset.map((row) => row.version));
}

async function applyMigration(pool: sql.ConnectionPool, migration: Migration): Promise<void> {
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    await new sql.Request(transaction).query(migration.sql);
    await new sql.Request(transaction)
      .input('version', sql.NVarChar(32), migration.version)
      .input('name', sql.NVarChar(255), migration.name).query(`
        INSERT INTO dbo.${SCHEMA_MIGRATIONS_TABLE} (version, name)
        VALUES (@version, @name);
      `);

    await transaction.commit();
  } catch (error) {
    try {
      await transaction.rollback();
    } catch {
      // ignore rollback failure
    }

    throw error;
  }
}
