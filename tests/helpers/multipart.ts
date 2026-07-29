import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { FIXTURE_PATHS, writeExcelFixtures } from './excel-fixtures.js';

export async function buildImportMultipartPayload(): Promise<{
  payload: Buffer;
  headers: Record<string, string>;
}> {
  await writeExcelFixtures();

  const clientes = await readFile(FIXTURE_PATHS.clientes);
  const pedidos = await readFile(FIXTURE_PATHS.pedidos);

  const boundary = `----VitestBoundary${String(Date.now())}`;
  const parts: Buffer[] = [];

  const appendFile = (name: string, filename: string, content: Buffer) => {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
          `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
      ),
    );
    parts.push(content);
    parts.push(Buffer.from('\r\n'));
  };

  appendFile('clientes', 'clientes.xlsx', clientes);
  appendFile('pedidos', 'pedidos.xlsx', pedidos);
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    payload: Buffer.concat(parts),
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
  };
}

export const FIXTURE_DIR = path.resolve('tests/fixtures');
