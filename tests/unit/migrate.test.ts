import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SqlServerConfig } from '../../src/config/index.js';
import { SqlPersistenceError } from '../../src/errors/SqlPersistenceError.js';

const poolQueryMock = vi.fn();
const requestFromPool = vi.fn(() => ({
  input: vi.fn().mockReturnThis(),
  query: poolQueryMock,
}));

const beginMock = vi.fn();
const commitMock = vi.fn();
const rollbackMock = vi.fn();
const transactionQueryMock = vi.fn();

vi.mock('../../src/database/sql.js', () => ({
  getSqlServerPool: vi.fn(() =>
    Promise.resolve({
      request: requestFromPool,
    }),
  ),
}));

vi.mock('mssql', () => ({
  default: {
    Transaction: vi.fn(function Transaction() {
      return {
        begin: beginMock,
        commit: commitMock,
        rollback: rollbackMock,
      };
    }),
    Request: vi.fn(function Request(scope?: unknown) {
      return scope
        ? {
            input: vi.fn().mockReturnThis(),
            query: transactionQueryMock,
          }
        : requestFromPool();
    }),
    NVarChar: vi.fn(() => 'NVarChar'),
  },
}));

vi.mock('../../src/database/migrations/index.js', () => ({
  migrations: [
    {
      version: '001',
      name: 'create_import_unified_table',
      sql: 'CREATE TABLE import_unified',
    },
    {
      version: '002',
      name: 'add_index',
      sql: 'CREATE INDEX idx_example',
    },
  ],
}));

import { runMigrations } from '../../src/database/migrate.js';

const sqlConfig: SqlServerConfig = {
  host: 'localhost',
  port: 1433,
  database: 'excel_import',
  user: 'sa',
  password: 'secret',
  trustServerCertificate: true,
};

describe('runMigrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    beginMock.mockResolvedValue(undefined);
    commitMock.mockResolvedValue(undefined);
    rollbackMock.mockResolvedValue(undefined);
    transactionQueryMock.mockResolvedValue(undefined);

    poolQueryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ recordset: [{ version: '001' }] });
  });

  it('aplica apenas migrations pendentes', async () => {
    const result = await runMigrations(sqlConfig);

    expect(result.applied).toEqual(['002']);
    expect(result.skipped).toEqual(['001']);
    expect(transactionQueryMock).toHaveBeenCalledWith('CREATE INDEX idx_example');
  });

  it('lança SqlPersistenceError quando migration falha', async () => {
    poolQueryMock.mockReset();
    poolQueryMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ recordset: [] });
    transactionQueryMock.mockRejectedValueOnce(new Error('syntax error'));

    await expect(runMigrations(sqlConfig)).rejects.toBeInstanceOf(SqlPersistenceError);
    expect(rollbackMock).toHaveBeenCalledOnce();
  });
});
