import ExcelJS from 'exceljs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FIXTURE_DIR = path.resolve('tests/fixtures');

export const FIXTURE_PATHS = {
  clientes: path.join(FIXTURE_DIR, 'clientes.xlsx'),
  pedidos: path.join(FIXTURE_DIR, 'pedidos.xlsx'),
  clientesInvalid: path.join(FIXTURE_DIR, 'clientes-sem-id.xlsx'),
} as const;

export async function writeExcelFixtures(): Promise<void> {
  await mkdir(FIXTURE_DIR, { recursive: true });

  const clientesWorkbook = new ExcelJS.Workbook();
  const clientesSheet = clientesWorkbook.addWorksheet('clientes');
  clientesSheet.addRow(['id', 'nome', 'email']);
  clientesSheet.addRow([1, 'Ana Silva', 'ana@example.com']);
  clientesSheet.addRow([2, 'Bruno Costa', 'bruno@example.com']);
  await clientesWorkbook.xlsx.writeFile(FIXTURE_PATHS.clientes);

  const pedidosWorkbook = new ExcelJS.Workbook();
  const pedidosSheet = pedidosWorkbook.addWorksheet('pedidos');
  pedidosSheet.addRow(['id', 'cliente_id', 'valor']);
  pedidosSheet.addRow([101, 1, 150.5]);
  pedidosSheet.addRow([102, 2, 89.9]);
  await pedidosWorkbook.xlsx.writeFile(FIXTURE_PATHS.pedidos);

  const invalidWorkbook = new ExcelJS.Workbook();
  const invalidSheet = invalidWorkbook.addWorksheet('clientes');
  invalidSheet.addRow(['nome', 'email']);
  invalidSheet.addRow(['Sem ID', 'x@example.com']);
  await invalidWorkbook.xlsx.writeFile(FIXTURE_PATHS.clientesInvalid);

  await writeFile(path.join(FIXTURE_DIR, '.gitkeep'), '');
}
