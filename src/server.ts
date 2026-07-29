import 'dotenv/config';

import { createApp } from './app.js';
import { loadEnv } from './config/index.js';
import { closeSqlServerPool } from './database/sql.js';

export async function startServer(): Promise<void> {
  const env = loadEnv();
  const app = await createApp({
    logger: env.NODE_ENV !== 'test',
    env,
  });

  registerGracefulShutdown(app);

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
    app.log.info('OpenAPI UI available at /docs');
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

function registerGracefulShutdown(app: Awaited<ReturnType<typeof createApp>>): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    app.log.info({ signal }, 'Graceful shutdown started');

    try {
      await app.close();
      await closeSqlServerPool();
      app.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      app.log.error({ error }, 'Graceful shutdown failed');
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isMain) {
  void startServer();
}
