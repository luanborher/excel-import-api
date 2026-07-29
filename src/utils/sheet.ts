import { ExcelReadError } from '../errors/ExcelReadError.js';

export function assertRequiredHeaders(headers: string[], required: readonly string[]): void {
  const normalized = new Set(headers.map((header) => header.trim().toLowerCase()));
  const missing = required.filter((column) => !normalized.has(column));

  if (missing.length > 0) {
    throw new ExcelReadError('Colunas obrigatórias ausentes na planilha', {
      missing,
      found: headers,
    });
  }
}

export function getCellString(row: Record<string, unknown>, column: string): string | null {
  const value = row[column];
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

export function getCellNumber(row: Record<string, unknown>, column: string): number {
  const value = row[column];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const asString = getCellString(row, column);
  if (asString === null) {
    throw new ExcelReadError(`Valor numérico ausente na coluna "${column}"`);
  }

  const parsed = Number(asString);
  if (!Number.isFinite(parsed)) {
    throw new ExcelReadError(`Valor inválido na coluna "${column}"`, { value: asString });
  }

  return parsed;
}
