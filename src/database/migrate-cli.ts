import 'dotenv/config';

import { loadEnv, resolveSqlServerConfig } from '../config/index.js';
import { closeSqlServerPool } from './sql.js';
import { runMigrations } from './migrate.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const config = resolveSqlServerConfig(env);

  if (!config) {
    console.error('SQL Server não configurado. Defina SQL_SERVER_HOST e demais variáveis no .env.');
    process.exit(1);
  }

  const result = await runMigrations(config);

  if (result.applied.length === 0) {
    console.log('Nenhuma migration pendente.');
  } else {
    console.log(`Migrations aplicadas: ${result.applied.join(', ')}`);
  }

  if (result.skipped.length > 0) {
    console.log(`Migrations já aplicadas: ${result.skipped.join(', ')}`);
  }
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('migrate-cli.ts') || process.argv[1].endsWith('migrate-cli.js'));

if (isMain) {
  main()
    .then(async () => {
      await closeSqlServerPool();
      process.exit(0);
    })
    .catch(async (error: unknown) => {
      console.error(error);
      await closeSqlServerPool();
      process.exit(1);
    });
}
