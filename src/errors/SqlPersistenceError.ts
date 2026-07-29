import { AppError } from './AppError.js';

export class SqlPersistenceError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'SQL_PERSISTENCE_ERROR', 503, details);
  }
}
