import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

import { getImportMaxFileSizeBytes, loadEnv, type Env } from './config/index.js';
import { AppError } from './errors/AppError.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerImportRoutes } from './routes/import.routes.js';
import type { ImportService } from './services/ImportService.js';
import { createImportService } from './services/create-import-service.js';
import { registerOpenApi } from './plugins/openapi.js';
import { createReadinessChecker, type ReadinessChecker } from './utils/readiness.js';
import { registerRequestContext } from './utils/request-context.js';

export type CreateAppOptions = {
  logger?: boolean;
  env?: Env;
  readiness?: ReadinessChecker;
  importService?: ImportService | null;
  enableOpenApi?: boolean;
  enableRequestLogging?: boolean;
};

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();
  const readiness = options.readiness ?? createReadinessChecker(env);
  const importService =
    options.importService !== undefined ? options.importService : createImportService(env);
  const maxUploadBytes = getImportMaxFileSizeBytes(env);
  const enableOpenApi = options.enableOpenApi ?? env.NODE_ENV !== 'test';
  const enableRequestLogging = options.enableRequestLogging ?? env.NODE_ENV !== 'test';

  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      if (typeof header === 'string' && header.trim().length > 0) {
        return header.trim();
      }
      return randomUUID();
    },
  });

  registerRequestContext(app);

  if (enableOpenApi) {
    await registerOpenApi(app);
  }

  await app.register(multipart, {
    limits: {
      fileSize: maxUploadBytes,
      files: 2,
    },
  });

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId;

    if (error instanceof AppError) {
      void reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      });
      return;
    }

    if (enableRequestLogging) {
      request.log.error({ err: error, requestId }, 'Unhandled error');
    }

    void reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        requestId,
      },
    });
  });

  registerHealthRoutes(app, readiness);
  registerImportRoutes(app, importService, maxUploadBytes);

  return app;
}
