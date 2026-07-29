import { AppError } from './AppError.js';

export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST', details?: unknown) {
    super(message, code, 400, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, code = 'SERVICE_UNAVAILABLE', details?: unknown) {
    super(message, code, 503, details);
  }
}
