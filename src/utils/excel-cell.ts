export type ExcelCellValue = string | number | boolean | Date | null;

function normalizeHeader(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim().toLowerCase();
  }

  if (value instanceof Date) {
    return value.toISOString().toLowerCase();
  }

  return '';
}

export function normalizeHeaders(rawHeaders: unknown[]): string[] {
  const headers: string[] = [];
  const seen = new Set<string>();

  for (const [index, raw] of rawHeaders.entries()) {
    let header = normalizeHeader(raw);
    if (!header) {
      header = `column_${index + 1}`;
    }

    let uniqueHeader = header;
    let suffix = 2;
    while (seen.has(uniqueHeader)) {
      uniqueHeader = `${header}_${suffix}`;
      suffix += 1;
    }

    seen.add(uniqueHeader);
    headers.push(uniqueHeader);
  }

  return headers;
}

export function toExcelCellValue(value: unknown): ExcelCellValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    if ('result' in value && value.result !== undefined) {
      return toExcelCellValue(value.result);
    }

    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }

    if ('richText' in value && Array.isArray(value.richText)) {
      const text = value.richText.map((part: { text?: string }) => part.text ?? '').join('');
      return text;
    }
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return null;
}

export function isRowEmpty(row: Record<string, ExcelCellValue>): boolean {
  return Object.values(row).every(
    (value) => value === null || (typeof value === 'string' && value.trim() === ''),
  );
}
