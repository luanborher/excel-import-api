# Camadas, funções e fluxo do projeto

Este documento descreve **cada parte do código na ordem em que participa do fluxo principal** de importação (`POST /api/v1/import`). No final há referência rápida a health, bootstrap e tipos.

---

## Visão do fluxo principal

```text
Cliente HTTP
    │
    ▼
server.ts → app.ts (Fastify)
    │
    ▼
routes/import.routes.ts
    │
    ▼
controllers/ImportController.import
    │   utils/multipart (arquivos + query)
    ▼
services/ImportService.importSpreadsheets
    │
    ├─► readers/ExcelReader (clientes + pedidos)
    │
    ├─► utils/relate-clientes-pedidos (join + validação)
    │
    └─► repositories/ImportRepository.insertBatch
            │
            └─► database/sql.ts (pool)
            └─► database/migrate.ts (schema — comando separado)
    │
    ▼
Resposta 201 { data: ImportReport }
```

---

## 1. Entrada da aplicação

### `src/server.ts`

| Função / trecho | O que faz |
|-----------------|-----------|
| `startServer()` | Carrega variáveis de ambiente, cria o app Fastify, registra shutdown gracioso e sobe o HTTP em `HOST`/`PORT`. |
| `registerGracefulShutdown(app)` | Escuta `SIGTERM`/`SIGINT`, fecha o servidor, fecha o pool SQL (`closeSqlServerPool`) e encerra o processo. |
| Bloco `isMain` | Só executa `startServer()` quando o arquivo é o entrypoint (`server.js` / `server.ts`). |

### `src/app.ts`

| Função / trecho | O que faz |
|-----------------|-----------|
| `createApp(options?)` | Monta a instância Fastify: request id, multipart, OpenAPI (opcional), error handler, rotas de health e import. |
| `genReqId` | Usa `X-Request-Id` do cliente se existir; senão gera UUID. |
| `registerRequestContext` | Hook que expõe `requestId` e loga cada request ao final. |
| `registerOpenApi` | Swagger + UI em `/docs` (desligado em `NODE_ENV=test` por padrão). |
| `app.register(multipart)` | Limita upload a 2 arquivos e tamanho via `IMPORT_MAX_FILE_SIZE_MB`. |
| `setErrorHandler` | Converte `AppError` (e subclasses) em JSON `{ error: { code, message, details, requestId } }`; demais erros → 500. |
| `createImportService(env)` | Cria o serviço de importação ou `null` se SQL não estiver configurado. |

---

## 2. Configuração

### `src/config/env.ts`

| Função / tipo | O que faz |
|---------------|-----------|
| `Env` | Tipo das variáveis validadas (host, porta, SQL, limite de upload, etc.). |
| `loadEnv(source?)` | Valida `process.env` com Zod; falha na subida se SQL estiver parcialmente configurado. |
| `getImportMaxFileSizeBytes(env)` | Converte `IMPORT_MAX_FILE_SIZE_MB` para bytes (usado no multipart). |

### `src/config/database.ts`

| Função / tipo | O que faz |
|---------------|-----------|
| `SqlServerConfig` | Objeto com host, porta, database, user e password do SQL Server. |
| `resolveSqlServerConfig(env)` | Retorna config SQL completa ou `null` se `SQL_SERVER_HOST` não estiver definido. |

### `src/config/index.ts`

Reexporta `loadEnv`, `getImportMaxFileSizeBytes`, `resolveSqlServerConfig` e tipos — ponto único de import para o resto do app.

---

## 3. Composição do domínio de importação

### `src/services/create-import-service.ts`

| Função | O que faz |
|--------|-----------|
| `createImportService(env)` | Se houver config SQL, instancia `ImportRepository` + `ExcelReader` e retorna `ImportService`; caso contrário `null` (API responde 503 no import). |

---

## 4. HTTP — rota e controller

### `src/routes/import.routes.ts`

| Função | O que faz |
|--------|-----------|
| `registerImportRoutes(app, importService, maxFileSizeBytes)` | Registra `POST /api/v1/import` com schema OpenAPI e delega para `ImportController.import`. |

### `src/controllers/ImportController.ts`

| Método | O que faz |
|--------|-----------|
| `constructor(importService, maxFileSizeBytes)` | Guarda dependências injetadas na criação das rotas. |
| `import(request, reply)` | 1) Garante que o serviço existe; 2) extrai buffers `clientes` e `pedidos`; 3) chama `importSpreadsheets`; 4) responde **201** com `{ data: report }`. |

### `src/utils/multipart.ts`

| Função | O que faz |
|--------|-----------|
| `parseImportMultipart(request, maxFileSizeBytes)` | Itera partes multipart, aceita só campos `clientes` e `pedidos`, valida tamanho por arquivo e retorna dois `Buffer`. |
---

## 5. Caso de uso — serviço de importação

### `src/services/ImportService.ts`

| Método | O que faz |
|--------|-----------|
| `constructor(repository, excelReader)` | Injeção de persistência e leitor Excel (testável e desacoplado). |
| `importSpreadsheets(input)` | Orquestra o fluxo completo: leitura paralela das planilhas → relacionamento → gera `batchId` (UUID) → insert no SQL → monta **relatório** (`ImportReport`). |

---

## 6. Leitura Excel

### `src/readers/ExcelReader.ts`

| Método / função interna | O que faz |
|-------------------------|-----------|
| `loadWorkbook(input)` | Abre `.xlsx` por caminho de arquivo ou buffer (`ExcelJS`). |
| `resolveWorksheet(workbook)` | Usa a **primeira aba** da planilha. |
| `worksheetToSheet(worksheet)` | Lê linha 1 como cabeçalho, demais linhas como registros (ignora linhas vazias). |
| `readSheet(input)` | Retorna estrutura bruta: `headers`, `rows`, `name`. |
| `readClientes(input)` | Exige colunas `id`, `nome`, `email` → array de `Cliente`. |
| `readPedidos(input)` | Exige colunas `id`, `cliente_id`, `valor` → array de `Pedido` (`clienteId` no modelo). |

### `src/utils/excel-cell.ts`

| Função | O que faz |
|--------|-----------|
| `normalizeHeaders(rawHeaders)` | Normaliza nomes de colunas (minúsculas, duplicatas com sufixo). |
| `toExcelCellValue(value)` | Converte célula ExcelJS (fórmula, rich text, data) em valor simples. |
| `isRowEmpty(row)` | Detecta linha sem dados úteis. |

### `src/utils/sheet.ts`

| Função | O que faz |
|--------|-----------|
| `assertRequiredHeaders(headers, required)` | Falha com `ExcelReadError` se faltar coluna obrigatória. |
| `getCellString(row, column)` | Lê texto da coluna (trim, null se vazio). |
| `getCellNumber(row, column)` | Lê número da coluna; falha se ausente ou inválido. |

---

## 7. Relacionamento e validação de negócio

### `src/utils/relate-clientes-pedidos.ts`

| Função / tipo | O que faz |
|---------------|-----------|
| `relateClientesPedidos` | Para cada pedido, busca o cliente pelo `clienteId`. Pedido sem cliente na planilha → `ImportRelationError` (422). |

### `src/models/Cliente.ts` / `src/models/Pedido.ts`

Tipos de domínio após parse da planilha:

- **Cliente:** `id`, `nome`, `email`
- **Pedido:** `id`, `clienteId`, `valor`

### `src/types/import.ts`

| Tipo | O que representa |
|------|------------------|
| `ExcelInput` | Caminho de arquivo ou buffer para o leitor. |
| `UnifiedImportRow` | Linha pronta para gravar: pedido + cliente desnormalizado. |
| `ImportInput` | Entrada do serviço: buffers e `batchId` opcional. |
| `ImportReport` | Relatório da importação retornado na API. |
| `PersistImportResult` | Resultado do insert SQL (batch, contagem, nome da tabela). |

---

## 8. Persistência SQL

### `src/repositories/ImportRepository.ts`

| Método / função | O que faz |
|-----------------|-----------|
| `insertBatch(batchId, rows)` | Se `rows` vazio, retorna sem transação. Senão: abre transação, insere em **chunks de 100 linhas** por statement, commit. Erro → rollback e `SqlPersistenceError`. |
| `insertRowsChunk` (interna) | Monta um `INSERT` multi-linha parametrizado para um chunk. |

### `src/database/migrate.ts`

| Função | O que faz |
|--------|-----------|
| `runMigrations(config)` | Garante tabela `schema_migrations`, aplica cada migration pendente **uma única vez** (via `npm run migrate`). |

### `src/database/sql.ts`

| Função / constante | O que faz |
|--------------------|-----------|
| `toSqlServerConnectionConfig(config)` | Mapeia config para driver `mssql` (`encrypt`, timeouts). |
| `getSqlServerPool(config)` | Pool singleton reutilizado entre requests. |
| `closeSqlServerPool()` | Fecha pool no shutdown. |
| `pingSqlServer(config)` | Conexão efêmera + `SELECT 1` para readiness. |
| `IMPORT_UNIFIED_TABLE` | Nome fixo da tabela: `import_unified`. |

### `src/database/migrations/`

Scripts versionados (`001_create_import_unified_table`, etc.) registrados em `schema_migrations` após aplicação.

---

## 9. Resposta e erros (caminho de volta)

Durante qualquer etapa acima, erros tipados sobem até o error handler do Fastify:

### `src/errors/AppError.ts`

| Item | O que faz |
|------|-----------|
| `AppError` | Base com `code`, `statusCode`, `details`. |
| `getErrorMessage(error)` | Extrai mensagem segura de `unknown`. |

### Erros usados no fluxo de importação

| Classe | HTTP | Quando |
|--------|------|--------|
| `BadRequestError` | 400 | Multipart inválido ou arquivo grande. |
| `ExcelReadError` | 400 | Planilha ilegível, coluna faltando, célula inválida. |
| `ImportRelationError` | 422 | Órfãos com `fail`, IDs duplicados. |
| `SqlPersistenceError` | 503 | Falha de conexão, migration ou insert no SQL. |
| `ServiceUnavailableError` | 503 | Import chamado sem SQL configurado (`IMPORT_NOT_CONFIGURED`). |

---

## 10. Fluxo paralelo — health e observabilidade

Não passa pelo import, mas faz parte do mesmo `app.ts`:

### `src/routes/health.routes.ts`

| Rota | O que faz |
|------|-----------|
| `GET /health` | Liveness: sempre `{ status: 'ok' }`. |
| `GET /health/ready` | Readiness: consulta SQL (se configurado); **200** ou **503**. |

### `src/utils/readiness.ts`

| Função | O que faz |
|--------|-----------|
| `getReadinessStatus(env)` | Define `checks.sqlServer`: `not_configured`, `ok` ou `down`. |
| `createReadinessChecker(env)` | Factory usada no `createApp` para injetar no health. |

### `src/utils/request-context.ts`

| Função | O que faz |
|--------|-----------|
| `registerRequestContext(app)` | Define `request.requestId` e log estruturado `request completed` no `onResponse`. |

### `src/plugins/openapi.ts`

| Função | O que faz |
|--------|-----------|
| `registerOpenApi(app)` | Publica spec OpenAPI 3 e Swagger UI em `/docs`. |

---

## 11. Mapa de pastas (referência)

| Pasta / arquivo | Papel na arquitetura |
|-----------------|----------------------|
| `server.ts` | Bootstrap e shutdown |
| `app.ts` | Configuração HTTP global |
| `config/` | Ambiente e SQL |
| `routes/` | Declaração de endpoints |
| `controllers/` | Adaptador HTTP → serviço |
| `services/` | Regra de orquestração da importação |
| `readers/` | Infraestrutura de leitura Excel |
| `utils/` | Regras puras (relate, sheet, multipart, readiness) |
| `repositories/` | Acesso a dados (insert em lote) |
| `database/` | Conexão SQL Server e migrations versionadas |
| `models/` + `types/` | Contratos de dados |
| `errors/` | Erros com status HTTP |
| `plugins/` | Extensões Fastify (OpenAPI) |

---

## 12. Contrato da API após import bem-sucedido

Corpo **201**:

```json
{
  "data": {
    "batchId": "uuid-do-lote",
    "tableName": "import_unified",
    "rowsInserted": 2,
    "unifiedRows": 2
  }
}
```

- **batchId:** identificador do lote na tabela SQL.
- **rowsInserted / unifiedRows:** quantidade de linhas unificadas gravadas.

---

## Ordem de leitura sugerida no código

Para seguir o fluxo como um debugger:

1. `server.ts` → `app.ts`
2. `routes/import.routes.ts` → `ImportController.ts`
3. `multipart.ts` → `ImportService.ts`
4. `ExcelReader.ts` + `sheet.ts` + `excel-cell.ts`
5. `relate-clientes-pedidos.ts`
6. `ImportRepository.ts` → `database/sql.ts`
7. `errors/*` + error handler em `app.ts`
