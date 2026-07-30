import 'dotenv/config';

import { randomInt, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { loadEnv, resolveSqlServerConfig } from '../../src/config/index.js';
import { pingSqlServer } from '../../src/database/sql.js';
import { ImportRepository } from '../../src/repositories/ImportRepository.js';
import { writeExcelFixtures } from '../helpers/excel-fixtures.js';
import { buildImportMultipartPayload } from '../helpers/multipart.js';

async function canRunSqlIntegration(): Promise<boolean> {
  if (process.env.RUN_INTEGRATION !== 'true') {
    return false;
  }

  try {
    const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
    const config = resolveSqlServerConfig(env);
    if (!config) {
      return false;
    }

    return pingSqlServer(config);
  } catch {
    return false;
  }
}

const integrationEnabled = await canRunSqlIntegration();

describe.skipIf(!integrationEnabled)('integração SQL (Docker)', () => {
  it('persiste lote na tabela import_unified', async () => {
    const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
    const config = resolveSqlServerConfig(env)!;
    const repository = new ImportRepository(config);

    const batchId = randomUUID();
    const pedidoId = randomInt(100_000, 999_999);
    const result = await repository.insertBatch(batchId, [
      {
        pedidoId,
        clienteId: 1,
        valor: 12.34,
        produto: 'Teclado',
        clienteNome: 'Integração SQL',
        clienteEmail: 'sql@test.local',
      },
    ]);

    expect(result.rowsInserted).toBe(1);
    expect(result.tableName).toBe('import_unified');
  });
});

describe.skipIf(!integrationEnabled)('E2E HTTP + SQL (Docker)', () => {
  it('POST /api/v1/import retorna 201 com relatório', async () => {
    await writeExcelFixtures();
    const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
    const app = await createApp({ logger: false, env, enableOpenApi: false });

    const { payload, headers } = await buildImportMultipartPayload();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/import',
      payload,
      headers,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        rowsInserted: 2,
        unifiedRows: 2,
      },
    });

    const ready = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({
      status: 'ok',
      checks: { sqlServer: 'ok' },
    });

    await app.close();
  });
});

describe('integração SQL (guard)', () => {
  it('testes de integração exigem RUN_INTEGRATION=true e SQL acessível', () => {
    if (integrationEnabled) {
      expect(process.env.RUN_INTEGRATION).toBe('true');
      return;
    }

    expect(process.env.RUN_INTEGRATION).not.toBe('true');
  });
});
