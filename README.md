# excel-import-api

Microserviço Node.js para importar planilhas Excel (`clientes` e `pedidos`), relacionar dados, validar e persistir em SQL Server.

## Quick start (máquina nova)

Ordem recomendada:

```bash
git clone <url-do-repositorio>
cd excel-import-api
cp .env.example .env
npm install
docker compose up -d
```

1. O **`.env` é obrigatório antes** do `docker compose` (senha `SQL_SERVER_PASSWORD` é usada pelos containers).
2. Aguarde o container `excel-import-sqlserver` ficar **healthy** (pode levar ~1 minuto na primeira vez).
3. Suba a API:

```bash
npm run dev
```

4. Teste:

```bash
npm run fixtures
curl http://localhost:3000/health
curl -X POST "http://localhost:3000/api/v1/import" \
  -F "clientes=@tests/fixtures/clientes.xlsx" \
  -F "pedidos=@tests/fixtures/pedidos.xlsx"
```

Documentação da API: http://localhost:3000/docs

**Validar stack completa (opcional):**

```bash
# PowerShell
$env:RUN_INTEGRATION="true"
npm run test:integration
```

### Pré-requisitos

- [Node.js 22+](https://nodejs.org/) (há `.nvmrc` com `22`)
- npm 10+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) com engine rodando (Linux containers; no Windows costuma exigir WSL2)

### Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| `Set SQL_SERVER_PASSWORD in .env` ao rodar compose | Arquivo `.env` não criado ou sem `SQL_SERVER_PASSWORD` |
| `IMPORT_NOT_CONFIGURED` (503) no import | Variáveis `SQL_SERVER_*` ausentes no `.env` da API |
| `curl` não acha `.xlsx` | Rodar `npm run fixtures` (planilhas não vêm no git) |
| SQL `down` no `/health/ready` | Container ainda subindo ou senha diferente entre `.env` e volume antigo do Docker |
| Docker não inicia (Windows) | Usuário sem permissão no grupo `docker-users` ou WSL2 não configurado |

Sem Docker, `npm run dev` sobe normalmente, mas **importação retorna 503** até o SQL estar configurado e acessível.

## Configuração

```bash
cp .env.example .env
npm install
```

Ajuste `SQL_SERVER_PASSWORD` no `.env` se necessário (deve ser o mesmo valor usado pelo Docker Compose).

## SQL Server (Docker Compose)

Subir o banco e criar o database `excel_import`:

```bash
docker compose up -d
```

Aguarde o container `excel-import-sqlserver` ficar healthy. O serviço `sqlserver-init` roda o script `docker/sqlserver/init.sql` uma vez.

Parar:

```bash
docker compose down
```

## Scripts

| Comando        | Descrição                          |
|----------------|------------------------------------|
| `npm run dev`  | Servidor em modo watch (tsx)       |
| `npm run fixtures` | Gera `tests/fixtures/*.xlsx` para testes manuais |
| `npm run build`| Compila TypeScript para `dist/`    |
| `npm start`    | Executa build de produção          |
| `npm test`     | Testes unitários (Vitest, `tests/unit/`) |
| `npm run test:integration` | Testes com SQL real (`RUN_INTEGRATION=true` + Docker) |
| `npm run ci`   | format:check + lint + build + test |
| `npm run lint` | ESLint                             |

### Suites em `tests/unit/`

| Arquivo | Escopo |
|---------|--------|
| `excel-reader.test.ts` | Leitura de planilhas |
| `relacionamento.test.ts` | Join clientes + pedidos |
| `validacoes.test.ts` | Regras de erro (órfãos, colunas, env, query) |
| `persistencia.test.ts` | `ImportRepository` (SQL mockado) |

## Endpoints

| Método | Rota             | Descrição |
|--------|------------------|-----------|
| GET    | `/health`        | Liveness |
| GET    | `/health/ready`  | Readiness — verifica SQL Server quando configurado no `.env` |
| POST   | `/api/v1/import` | Multipart: `clientes` + `pedidos` (.xlsx) |

Com Docker e `.env` SQL configurados (gere as planilhas com `npm run fixtures`):

```bash
curl -X POST "http://localhost:3000/api/v1/import" \
  -F "clientes=@tests/fixtures/clientes.xlsx" \
  -F "pedidos=@tests/fixtures/pedidos.xlsx"
```

Sem SQL no `.env`, o endpoint retorna **503** (`IMPORT_NOT_CONFIGURED`).

Documentação interativa: **http://localhost:3000/docs** (OpenAPI / Swagger UI).

Variável `IMPORT_MAX_FILE_SIZE_MB` (padrão **10**, máximo **50**) limita o tamanho de cada arquivo no upload.

## Estrutura do projeto

```text
src/
├── app.ts              # Fastify, plugins, error handler
├── server.ts           # Entry point (listen + shutdown)
├── config/
│   ├── env.ts          # Variáveis de ambiente (Zod)
│   └── database.ts     # Config SQL Server
├── controllers/
│   └── ImportController.ts
├── services/
│   ├── ImportService.ts
│   └── create-import-service.ts
├── repositories/
│   └── ImportRepository.ts
├── readers/
│   └── ExcelReader.ts
├── database/
│   └── sql.ts          # Pool, ping, DDL import_unified
├── models/
│   ├── Cliente.ts
│   └── Pedido.ts
├── types/
│   └── import.ts
├── utils/
├── routes/
│   ├── import.routes.ts
│   └── health.routes.ts
└── errors/
docker/
└── sqlserver/
```

## Fluxo da importação

1. `ExcelReader` lê `clientes.xlsx` e `pedidos.xlsx`
2. `relateClientesPedidos` relaciona pedidos ao cliente e valida (órfãos, IDs duplicados)
3. `ImportRepository` grava linhas unificadas em `import_unified` (transação SQL, insert em chunks)
4. API retorna relatório (`batchId`, linhas inseridas, pedidos ignorados, etc.)

## Stack

- Node.js 22
- TypeScript 5.0.4
- Fastify 5
- Zod (validação de config)
- mssql (SQL Server)
- ExcelJS (leitura de planilhas)
- Docker Compose (SQL Server 2022)

## Planilhas

| Arquivo | Colunas obrigatórias |
|---------|----------------------|
| `clientes.xlsx` | `id`, `nome`, `email` |
| `pedidos.xlsx` | `id`, `cliente_id`, `valor` |

Pedidos com `cliente_id` inexistente na planilha de clientes retornam **422** (`ORPHAN_PEDIDOS`).