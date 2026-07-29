import type { FastifyReply, FastifyRequest } from 'fastify';

import { ServiceUnavailableError } from '../errors/HttpErrors.js';
import type { ImportService } from '../services/ImportService.js';
import { parseImportMultipart, parseOrphanPolicy } from '../utils/multipart.js';

export class ImportController {
  constructor(
    private readonly importService: ImportService | null,
    private readonly maxFileSizeBytes: number,
  ) {}

  async import(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.importService) {
      throw new ServiceUnavailableError(
        'Importação indisponível: SQL Server não configurado no ambiente',
        'IMPORT_NOT_CONFIGURED',
      );
    }

    const { clientes, pedidos } = await parseImportMultipart(request, this.maxFileSizeBytes);
    const orphanPolicy = parseOrphanPolicy(
      (request.query as { orphanPolicy?: string }).orphanPolicy,
    );

    const report = await this.importService.importSpreadsheets({
      clientes,
      pedidos,
      orphanPolicy,
    });

    await reply.status(201).send({ data: report });
  }
}
