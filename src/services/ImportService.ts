import { randomUUID } from 'node:crypto';

import type { ExcelReader } from '../readers/ExcelReader.js';
import type { ImportRepository } from '../repositories/ImportRepository.js';
import type { ImportInput, ImportReport } from '../types/import.js';
import { relateClientesPedidos } from '../utils/relate-clientes-pedidos.js';

export class ImportService {
  constructor(
    private readonly repository: ImportRepository,
    private readonly excelReader: ExcelReader,
  ) {}

  async importSpreadsheets(input: ImportInput): Promise<ImportReport> {
    const [clientes, pedidos] = await Promise.all([
      this.excelReader.readClientes(input.clientes),
      this.excelReader.readPedidos(input.pedidos),
    ]);

    const { rows, skippedPedidos } = relateClientesPedidos(clientes, pedidos, {
      orphanPolicy: input.orphanPolicy ?? 'fail',
    });

    const batchId = input.batchId ?? randomUUID();
    const persisted = await this.repository.insertBatch(batchId, rows);

    return {
      batchId: persisted.batchId,
      tableName: persisted.tableName,
      rowsInserted: persisted.rowsInserted,
      unifiedRows: rows.length,
      skippedPedidos,
    };
  }
}
