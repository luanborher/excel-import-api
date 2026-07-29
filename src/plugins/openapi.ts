import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Excel Import API',
        description: 'Importação de planilhas clientes/pedidos com persistência em SQL Server.',
        version: '1.0.0',
      },
      tags: [
        { name: 'health', description: 'Liveness e readiness' },
        { name: 'import', description: 'Importação de planilhas' },
      ],
      components: {
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: {},
                  requestId: { type: 'string' },
                },
                required: ['code', 'message'],
              },
            },
            required: ['error'],
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
    },
  });
}
