import type { Env } from '../config/index.js';
import { resolveSqlServerConfig } from '../config/index.js';
import { ExcelReader } from '../readers/ExcelReader.js';
import { ImportRepository } from '../repositories/ImportRepository.js';
import { ImportService } from './ImportService.js';

export function createImportService(env: Env): ImportService | null {
  const sqlConfig = resolveSqlServerConfig(env);
  if (!sqlConfig) {
    return null;
  }

  return new ImportService(new ImportRepository(sqlConfig), new ExcelReader());
}
