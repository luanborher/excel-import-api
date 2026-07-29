import { AppError } from './AppError.js';

export type OrphanPedido = {
  pedidoId: number;
  clienteId: number;
  valor: number;
};

export class ImportRelationError extends AppError {
  constructor(
    message: string,
    readonly relationCode: 'DUPLICATE_CLIENTE_ID' | 'DUPLICATE_PEDIDO_ID' | 'ORPHAN_PEDIDOS',
    details?: unknown,
  ) {
    super(message, relationCode, 422, details);
  }
}
