import type { FastifyInstance } from 'fastify';

import type { ReadinessChecker } from '../utils/readiness.js';

export function registerHealthRoutes(app: FastifyInstance, readiness: ReadinessChecker): void {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
            },
          },
        },
      },
    },
    () => ({
      status: 'ok',
    }),
  );

  app.get(
    '/health/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness probe (SQL Server quando configurado)',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: {
                type: 'object',
                properties: {
                  sqlServer: { type: 'string' },
                },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: {
                type: 'object',
                properties: {
                  sqlServer: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const result = await readiness();
      const statusCode = result.status === 'ok' ? 200 : 503;

      return reply.status(statusCode).send(result);
    },
  );
}
