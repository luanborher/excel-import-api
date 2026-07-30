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
  });

  it('retorna listas vazias quando não há pedidos', () => {
    const result = relateClientesPedidos(clientes, []);

    expect(result.rows).toEqual([]);
  });
});
