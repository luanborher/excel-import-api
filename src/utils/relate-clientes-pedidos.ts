import type { Cliente } from '../models/Cliente.js';
import type { Pedido } from '../models/Pedido.js';
import type { UnifiedImportRow } from '../types/import.js';
import { ImportRelationError, type OrphanPedido } from '../errors/ImportRelationError.js';

export type RelateClientesPedidosResult = {
  rows: UnifiedImportRow[];
};

function buildClienteIndex(clientes: Cliente[]): Map<number, Cliente> {
  const index = new Map<number, Cliente>();

  for (const cliente of clientes) {
    if (index.has(cliente.id)) {
      throw new ImportRelationError(
        `Cliente duplicado na planilha: id ${String(cliente.id)}`,
        'DUPLICATE_CLIENTE_ID',
        { clienteId: cliente.id },
      );
    }

    index.set(cliente.id, cliente);
  }

  return index;
}

function assertUniquePedidoIds(pedidos: Pedido[]): void {
  const seen = new Set<number>();

  for (const pedido of pedidos) {
    if (seen.has(pedido.id)) {
      throw new ImportRelationError(
        `Pedido duplicado na planilha: id ${String(pedido.id)}`,
        'DUPLICATE_PEDIDO_ID',
        { pedidoId: pedido.id },
      );
    }

    seen.add(pedido.id);
  }
}

export function relateClientesPedidos(
  clientes: Cliente[],
  pedidos: Pedido[],
): RelateClientesPedidosResult {
  const clienteIndex = buildClienteIndex(clientes);
  assertUniquePedidoIds(pedidos);

  const rows: UnifiedImportRow[] = [];
  const orphans: OrphanPedido[] = [];

  for (const pedido of pedidos) {
    const cliente = clienteIndex.get(pedido.clienteId);

    if (!cliente) {
      orphans.push({
        pedidoId: pedido.id,
        clienteId: pedido.clienteId,
        valor: pedido.valor,
      });
      continue;
    }

    rows.push({
      pedidoId: pedido.id,
      clienteId: cliente.id,
      valor: pedido.valor,
      produto: pedido.produto,
      clienteNome: cliente.nome,
      clienteEmail: cliente.email,
    });
  }

  if (orphans.length > 0) {
    throw new ImportRelationError(
      'Pedidos com cliente_id inexistente na planilha de clientes',
      'ORPHAN_PEDIDOS',
      {
        pedidos: orphans,
      },
    );
  }

  return { rows };
}
