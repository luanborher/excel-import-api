import sql from 'mssql';

import type { SqlServerConfig } from '../config/index.js';
import { getSqlServerPool, IMPORT_UNIFIED_TABLE } from '../database/sql.js';
import { getErrorMessage } from '../errors/AppError.js';
import { SqlPersistenceError } from '../errors/SqlPersistenceError.js';
import type { PersistImportResult, UnifiedImportRow } from '../types/import.js';

const INSERT_CHUNK_SIZE = 100;

export class ImportRepository {
  constructor(private readonly config: SqlServerConfig) {}

  async insertBatch(batchId: string, rows: UnifiedImportRow[]): Promise<PersistImportResult> {
    if (rows.length === 0) {
      return {
        batchId,
        rowsInserted: 0,
        tableName: IMPORT_UNIFIED_TABLE,
      };
    }

    const pool = await getSqlServerPool(this.config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
        const chunk = rows.slice(offset, offset + INSERT_CHUNK_SIZE);
        await insertRowsChunk(transaction, batchId, chunk);
      }

      await transaction.commit();

      return {
        batchId,
        rowsInserted: rows.length,
        tableName: IMPORT_UNIFIED_TABLE,
      };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // ignore rollback failure
      }

      throw new SqlPersistenceError('Falha ao inserir dados da importação', {
        cause: getErrorMessage(error),
        batchId,
      });
    }
  }
}

async function insertRowsChunk(
  transaction: sql.Transaction,
  batchId: string,
  rows: UnifiedImportRow[],
): Promise<void> {
  const request = new sql.Request(transaction);
  request.input('import_batch_id', sql.UniqueIdentifier, batchId);

  const valueTuples: string[] = [];

  rows.forEach((row, index) => {
    const pedidoKey = `pedido_id_${String(index)}`;
    const clienteKey = `cliente_id_${String(index)}`;
    const valorKey = `valor_${String(index)}`;
    const produtoKey = `produto_${String(index)}`;
    const nomeKey = `cliente_nome_${String(index)}`;
    const emailKey = `cliente_email_${String(index)}`;

    request.input(pedidoKey, sql.Int, row.pedidoId);
    request.input(clienteKey, sql.Int, row.clienteId);
    request.input(valorKey, sql.Decimal(18, 2), row.valor);
    request.input(produtoKey, sql.NVarChar(255), row.produto);
    request.input(nomeKey, sql.NVarChar(255), row.clienteNome);
    request.input(emailKey, sql.NVarChar(255), row.clienteEmail);

    valueTuples.push(
      `(@import_batch_id, @${pedidoKey}, @${clienteKey}, @${valorKey}, @${produtoKey}, @${nomeKey}, @${emailKey})`,
    );
  });

  await request.query(`
    INSERT INTO dbo.${IMPORT_UNIFIED_TABLE} (
      import_batch_id,
      pedido_id,
      cliente_id,
      valor,
      produto,
      cliente_nome,
      cliente_email
    ) VALUES ${valueTuples.join(', ')};
  `);
}
