import { beforeAll, describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/index.js';
import { ImportRelationError } from '../../src/errors/ImportRelationError.js';
import type { Cliente } from '../../src/models/Cliente.js';
import type { Pedido } from '../../src/models/Pedido.js';
import { ExcelReader } from '../../src/readers/ExcelReader.js';
import { relateClientesPedidos } from '../../src/utils/relate-clientes-pedidos.js';
import { FIXTURE_PATHS, writeExcelFixtures } from '../helpers/excel-fixtures.js';

const clientes: Cliente[] = [
  { id: 1, nome: 'Ana Silva', email: 'ana@example.com' },
  { id: 2, nome: 'Bruno Costa', email: null },
];

const pedidos: Pedido[] = [
  { id: 101, clienteId: 1, valor: 150.5, produto: 'Notebook' },
  { id: 102, clienteId: 2, valor: 89.9, produto: 'Mouse' },
];

describe('validações de relacionamento', () => {
  it('pula pedidos órfãos (cliente_id inexistente) e mantém os válidos', () => {
    const pedidosComOrfao: Pedido[] = [
      ...pedidos,
      { id: 103, clienteId: 999, valor: 42, produto: 'X' },
    ];

    const result = relateClientesPedidos(clientes, pedidosComOrfao);

    expect(result.rows).toHaveLength(2);
    expect(result.skippedPedidos).toEqual([{ pedidoId: 103, clienteId: 999, valor: 42 }]);
  });

  it('rejeita clientes com id duplicado na planilha', () => {
    const clientesDuplicados: Cliente[] = [
      { id: 1, nome: 'A', email: null },
      { id: 1, nome: 'B', email: null },
    ];

    expect(() => relateClientesPedidos(clientesDuplicados, pedidos)).toThrow(ImportRelationError);
  });

  it('rejeita pedidos com id duplicado na planilha', () => {
    const pedidosDuplicados: Pedido[] = [
      { id: 101, clienteId: 1, valor: 10, produto: 'A' },
      { id: 101, clienteId: 2, valor: 20, produto: 'B' },
    ];

    expect(() => relateClientesPedidos(clientes, pedidosDuplicados)).toThrow(ImportRelationError);
  });
});

describe('validações de planilha Excel', () => {
  const reader = new ExcelReader();

  beforeAll(async () => {
    await writeExcelFixtures();
  });

  it('rejeita planilha de clientes sem colunas obrigatórias', async () => {
    await expect(reader.readClientes(FIXTURE_PATHS.clientesInvalid)).rejects.toThrow();
  });

  it('rejeita leitura de clientes a partir de planilha de pedidos', async () => {
    await expect(reader.readClientes(FIXTURE_PATHS.pedidos)).rejects.toThrow();
  });
});

describe('validações de configuração', () => {
  it('rejeita configuração SQL parcial', () => {
    expect(() =>
      loadEnv({
        SQL_SERVER_HOST: 'localhost',
      }),
    ).toThrow(/Invalid environment configuration/);
  });
});
