import type { FastifyInstance } from 'fastify';

import { ImportController } from '../controllers/ImportController.js';
import type { ImportService } from '../services/ImportService.js';

export function registerImportRoutes(
  app: FastifyInstance,
  importService: ImportService | null,
  maxFileSizeBytes: number,
): void {
  const controller = new ImportController(importService, maxFileSizeBytes);

  app.post(
    '/api/v1/import',
    {
      schema: {
        tags: ['import'],
        summary: 'Importa planilhas clientes e pedidos',
        description: 'Multipart form com campos `clientes` e `pedidos` (.xlsx).',
        consumes: ['multipart/form-data'],
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.import(request, reply),
  );
}
