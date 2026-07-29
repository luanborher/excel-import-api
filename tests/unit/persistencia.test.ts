import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SqlServerConfig } from '../../src/config/index.js';
import { SqlPersistenceError } from '../../src/errors/SqlPersistenceError.js';
import { ImportRepository } from '../../src/repositories/ImportRepository.js';
import type { UnifiedImportRow } from '../../src/types/import.js';

const sqlConfig: SqlServerConfig = {
  host: 'localhost',
  port: 1433,
  database: 'excel_import',
  user: 'sa',
  password: 'secret',
  trustServerCertificate: true,
};

const sampleRows: UnifiedImportRow[] = [
  {
    pedidoId: 101,
    clienteId: 1,
    valor: 10,
    clienteNome: 'Ana',
    clienteEmail: 'ana@example.com',
  },
];

const poolQueryMock = vi.fn();
const transactionQueryMock = vi.fn();
const beginMock = vi.fn();
const commitMock = vi.fn();
const rollbackMock = vi.fn();

const requestFromPool = vi.fn(() => ({
  query: poolQueryMock,
}));

const requestFromTransaction = vi.fn(() => ({
  input: vi.fn().mockReturnThis(),
  query: transactionQueryMock,
}));

vi.mock('../../src/database/sql.js', () => ({
  getSqlServerPool: vi.fn(() =>
    Promise.resolve({
      request: requestFromPool,
    }),
  ),
  CREATE_IMPORT_UNIFIED_TABLE_SQL: 'CREATE TABLE import_unified',
  IMPORT_UNIFIED_TABLE: 'import_unified',
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
      return scope ? requestFromTransaction() : requestFromPool();
    }),
    UniqueIdentifier: 'UniqueIdentifier',
    Int: 'Int',
    Decimal: vi.fn(() => 'Decimal'),
    NVarChar: vi.fn(() => 'NVarChar'),
  },
}));

describe('persistência SQL (ImportRepository)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolQueryMock.mockResolvedValue(undefined);
    transactionQueryMock.mockResolvedValue(undefined);
    beginMock.mockResolvedValue(undefined);
    commitMock.mockResolvedValue(undefined);
    rollbackMock.mockResolvedValue(undefined);
  });

  it('garante schema executando DDL no pool', async () => {
    const repository = new ImportRepository(sqlConfig);

    await repository.ensureSchema();

    expect(poolQueryMock).toHaveBeenCalledWith('CREATE TABLE import_unified');
  });

  it('insere lote em transação e faz commit', async () => {
    const repository = new ImportRepository(sqlConfig);
    const batchId = '11111111-1111-1111-1111-111111111111';

    const result = await repository.insertBatch(batchId, sampleRows);

    expect(beginMock).toHaveBeenCalledOnce();
    expect(transactionQueryMock).toHaveBeenCalled();
    expect(commitMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      batchId,
      rowsInserted: 1,
      tableName: 'import_unified',
    });
  });

  it('retorna zero linhas sem abrir transação quando o lote está vazio', async () => {
    const repository = new ImportRepository(sqlConfig);

    const result = await repository.insertBatch('empty-batch', []);

    expect(beginMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      batchId: 'empty-batch',
      rowsInserted: 0,
      tableName: 'import_unified',
    });
  });

  it('faz rollback e lança SqlPersistenceError quando insert falha', async () => {
    transactionQueryMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('constraint violation'));
    const repository = new ImportRepository(sqlConfig);

    await expect(repository.insertBatch('fail-batch', sampleRows)).rejects.toBeInstanceOf(
      SqlPersistenceError,
    );

    expect(rollbackMock).toHaveBeenCalledOnce();
    expect(commitMock).not.toHaveBeenCalled();
  });

  it('lança SqlPersistenceError quando ensureSchema falha', async () => {
    poolQueryMock.mockRejectedValueOnce(new Error('connection refused'));
    const repository = new ImportRepository(sqlConfig);

    await expect(repository.ensureSchema()).rejects.toBeInstanceOf(SqlPersistenceError);
  });
});
