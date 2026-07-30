import type { FastifyRequest } from 'fastify';

import { BadRequestError } from '../errors/HttpErrors.js';

export type ImportUploadFiles = {
  clientes: Buffer;
  pedidos: Buffer;
};

export async function parseImportMultipart(
  request: FastifyRequest,
  maxFileSizeBytes: number,
): Promise<ImportUploadFiles> {
  const files: Partial<Record<'clientes' | 'pedidos', Buffer>> = {};

  try {
    for await (const part of request.parts()) {
      if (part.type !== 'file') {
        continue;
      }

      if (part.fieldname !== 'clientes' && part.fieldname !== 'pedidos') {
        continue;
      }

      const buffer = await part.toBuffer();
      if (buffer.byteLength > maxFileSizeBytes) {
        const limitMb = Math.round(maxFileSizeBytes / (1024 * 1024));
        throw new BadRequestError(
          `Arquivo "${part.fieldname}" excede o limite de ${String(limitMb)}MB`,
        );
      }

      files[part.fieldname] = buffer;
    }
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new BadRequestError('Requisição multipart inválida', 'BAD_REQUEST', { cause: message });
  }

  if (!files.clientes) {
    throw new BadRequestError('Arquivo "clientes" é obrigatório (multipart field)');
  }

  if (!files.pedidos) {
    throw new BadRequestError('Arquivo "pedidos" é obrigatório (multipart field)');
  }

  return {
    clientes: files.clientes,
    pedidos: files.pedidos,
  };
}
