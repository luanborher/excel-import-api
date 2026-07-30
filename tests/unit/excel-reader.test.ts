import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';

import { ExcelReadError } from '../../src/errors/ExcelReadError.js';
import { ExcelReader } from '../../src/readers/ExcelReader.js';
import { FIXTURE_PATHS, writeExcelFixtures } from '../helpers/excel-fixtures.js';

describe('leitura do Excel', () => {
  const reader = new ExcelReader();

  beforeAll(async () => {
    await writeExcelFixtures();
  });

  it('lê cabeçalhos e linhas da planilha de clientes', async () => {
    const sheet = await reader.readSheet(FIXTURE_PATHS.clientes);

    expect(sheet.headers).toEqual(['id', 'nome', 'email']);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0]).toMatchObject({
      id: 1,
      nome: 'Ana Silva',
      email: 'ana@example.com',
    });
  });

  it('lê cabeçalhos e linhas da planilha de pedidos', async () => {
    const sheet = await reader.readSheet(FIXTURE_PATHS.pedidos);

    expect(sheet.headers).toEqual(['id', 'cliente_id', 'valor']);
    expect(sheet.rows).toHaveLength(2);
  });

  it('lê clientes a partir de buffer em memória', async () => {
    const buffer = await readFile(FIXTURE_PATHS.clientes);
    const clientes = await reader.readClientes(buffer);

    expect(clientes).toEqual([
      { id: 1, nome: 'Ana Silva', email: 'ana@example.com' },
      { id: 2, nome: 'Bruno Costa', email: 'bruno@example.com' },
    ]);
  });

  it('lê pedidos mapeando cliente_id para clienteId', async () => {
    const pedidos = await reader.readPedidos(FIXTURE_PATHS.pedidos);

    expect(pedidos[0]).toEqual({ id: 101, clienteId: 1, valor: 150.5 });
  });

  it('falha quando o arquivo não existe', async () => {
    await expect(reader.readSheet('tests/fixtures/inexistente.xlsx')).rejects.toBeInstanceOf(
      ExcelReadError,
    );
  });
});
