import { migration001 } from './001_create_import_unified_table.js';
import type { Migration } from '../migrate.js';

export const migrations: Migration[] = [migration001];
