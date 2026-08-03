import type { Migration } from '../migrate.js';

export const migration001: Migration = {
  version: '001',
  name: 'create_import_unified_table',
  sql: `
IF OBJECT_ID(N'dbo.import_unified', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.import_unified (
    import_batch_id UNIQUEIDENTIFIER NOT NULL,
    pedido_id INT NOT NULL,
    cliente_id INT NOT NULL,
    valor DECIMAL(18, 2) NOT NULL,
    produto NVARCHAR(255) NOT NULL,
    cliente_nome NVARCHAR(255) NOT NULL,
    cliente_email NVARCHAR(255) NULL,
    imported_at DATETIME2 NOT NULL CONSTRAINT DF_import_unified_imported_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_import_unified PRIMARY KEY (import_batch_id, pedido_id)
  );
END;

IF COL_LENGTH(N'dbo.import_unified', N'produto') IS NULL
BEGIN
  ALTER TABLE dbo.import_unified
    ADD produto NVARCHAR(255) NOT NULL CONSTRAINT DF_import_unified_produto DEFAULT (N'');
END;
`,
};
