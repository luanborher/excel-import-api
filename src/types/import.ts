import type { OrphanPedidoPolicy } from '../utils/relate-clientes-pedidos.js';

export type ExcelInput = string | Buffer | ArrayBuffer | Uint8Array;

export type UnifiedImportRow = {
  pedidoId: number;
  clienteId: number;
  valor: number;
  clienteNome: string;
  clienteEmail: string | null;
};

export type ImportInput = {
  clientes: ExcelInput;
  pedidos: ExcelInput;
  orphanPolicy?: OrphanPedidoPolicy;
  batchId?: string;
};

export type ImportReport = {
  batchId: string;
  tableName: string;
  rowsInserted: number;
  unifiedRows: number;
  skippedPedidos: {
    pedidoId: number;
    clienteId: number;
    valor: number;
  }[];
};

export type PersistImportResult = {
  batchId: string;
  rowsInserted: number;
  tableName: string;
};
