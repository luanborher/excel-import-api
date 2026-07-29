import { AppError } from './AppError.js';

export class ExcelReadError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'EXCEL_READ_ERROR', 400, details);
  }
}
