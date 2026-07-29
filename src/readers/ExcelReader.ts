import ExcelJS from 'exceljs';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

import { ExcelReadError } from '../errors/ExcelReadError.js';
import type { Cliente } from '../models/Cliente.js';
import type { Pedido } from '../models/Pedido.js';
import type { ExcelInput } from '../types/import.js';
import {
  isRowEmpty,
  normalizeHeaders,
  toExcelCellValue,
  type ExcelCellValue,
} from '../utils/excel-cell.js';
import { assertRequiredHeaders, getCellNumber, getCellString } from '../utils/sheet.js';

export type ExcelSheet = {
  name: string;
  headers: string[];
  rows: Record<string, ExcelCellValue>[];
};

const CLIENTES_COLUMNS = ['id', 'nome', 'email'] as const;
const PEDIDOS_COLUMNS = ['id', 'cliente_id', 'valor'] as const;

function resolveWorksheet(workbook: ExcelJS.Workbook, sheetIndex = 1): ExcelJS.Worksheet {
  const worksheet = workbook.getWorksheet(sheetIndex);
  if (!worksheet) {
    throw new ExcelReadError(
      `Planilha na posição ${String(sheetIndex)} não encontrada no arquivo Excel`,
    );
  }
  return worksheet;
}

async function loadWorkbook(input: ExcelInput): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  try {
    if (typeof input === 'string') {
      await access(input, fsConstants.R_OK);
      await workbook.xlsx.readFile(input);
      return workbook;
    }

    await workbook.xlsx.load(input);
    return workbook;
  } catch (error) {
    if (error instanceof ExcelReadError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new ExcelReadError('Falha ao ler arquivo Excel', { cause: message });
  }
}

function worksheetToSheet(worksheet: ExcelJS.Worksheet): ExcelSheet {
  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
  const headers = normalizeHeaders(headerValues);

  if (headers.every((header) => header.startsWith('column_'))) {
    throw new ExcelReadError('Cabeçalho da planilha não encontrado na primeira linha');
  }

  const rows: ExcelSheet['rows'] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record: Record<string, ExcelCellValue> = {};
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      record[header] = toExcelCellValue(cell.value);
    });

    if (!isRowEmpty(record)) {
      rows.push(record);
    }
  });

  return {
    name: worksheet.name,
    headers,
    rows,
  };
}

export class ExcelReader {
  async readSheet(input: ExcelInput): Promise<ExcelSheet> {
    const workbook = await loadWorkbook(input);
    const worksheet = resolveWorksheet(workbook);
    return worksheetToSheet(worksheet);
  }

  async readClientes(input: ExcelInput): Promise<Cliente[]> {
    const sheet = await this.readSheet(input);
    assertRequiredHeaders(sheet.headers, CLIENTES_COLUMNS);

    return sheet.rows.map((row) => ({
      id: getCellNumber(row, 'id'),
      nome: getCellString(row, 'nome') ?? '',
      email: getCellString(row, 'email'),
    }));
  }

  async readPedidos(input: ExcelInput): Promise<Pedido[]> {
    const sheet = await this.readSheet(input);
    assertRequiredHeaders(sheet.headers, PEDIDOS_COLUMNS);

    return sheet.rows.map((row) => ({
      id: getCellNumber(row, 'id'),
      clienteId: getCellNumber(row, 'cliente_id'),
      valor: getCellNumber(row, 'valor'),
    }));
  }
}
