import { describe, expect, it } from 'vitest';

import type { Cliente } from '../../src/models/Cliente.js';
import type { Pedido } from '../../src/models/Pedido.js';
import { relateClientesPedidos } from '../../src/utils/relate-clientes-pedidos.js';

const clientes: Cliente[] = [
  { id: 1, nome: 'Ana Silva', email: 'ana@example.com' },
  { id: 2, nome: 'Bruno Costa', email: null },
];

const pedidos: Pedido[] = [
  { id: 101, clienteId: 1, valor: 150.5 },
  { id: 102, clienteId: 2, valor: 89.9 },
];

describe('relacionamento clientes e pedidos', () => {
  it('gera uma linha unificada por pedido com dados do cliente', () => {
    const result = relateClientesPedidos(clientes, pedidos);

    expect(result.rows).toEqual([
      {
        pedidoId: 101,
        clienteId: 1,
        valor: 150.5,
        clienteNome: 'Ana Silva',
        clienteEmail: 'ana@example.com',
      },
      {
        pedidoId: 102,
        clienteId: 2,
        valor: 89.9,
        clienteNome: 'Bruno Costa',
        clienteEmail: null,
      },
    ]);
    expect(result.skippedPedidos).toEqual([]);
  });

  it('com orphanPolicy skip relaciona pedidos válidos e lista órfãos separadamente', () => {
    const pedidosComOrfao: Pedido[] = [...pedidos, { id: 103, clienteId: 999, valor: 42 }];

    const result = relateClientesPedidos(clientes, pedidosComOrfao, { orphanPolicy: 'skip' });

    expect(result.rows).toHaveLength(2);
    expect(result.skippedPedidos).toEqual([{ pedidoId: 103, clienteId: 999, valor: 42 }]);
  });

  it('retorna listas vazias quando não há pedidos', () => {
    const result = relateClientesPedidos(clientes, []);

    expect(result.rows).toEqual([]);
    expect(result.skippedPedidos).toEqual([]);
  });
});
