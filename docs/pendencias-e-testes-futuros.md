# Pendências e testes futuros

Registro por task do que ficou pendente e o que testar depois (integração / Docker / E2E).

## Task 3 — Leitor Excel

### Pendências

- [ ] Ler planilhas a partir de **upload HTTP** (`Buffer` / stream) no `POST /import` (Task 6)
- [ ] Suporte a **múltiplas abas** nomeadas (`clientes` / `pedidos`) se os arquivos reais não usarem a primeira aba
- [ ] Validação linha a linha com **número da linha** no erro (melhor DX para o usuário)
- [ ] Planilhas **grandes** (streaming/chunk) — hoje carrega o arquivo inteiro na memória
- [ ] Commitar fixtures `.xlsx` estáticos no repo (hoje gerados no `beforeAll` dos testes)
- [ ] Documentar contrato oficial das colunas para o time de negócio

### Testes futuros

- [ ] Integração: arquivos `.xlsx` reais fornecidos pela empresa
- [ ] Upload multipart no endpoint de importação
- [ ] Arquivo corrompido, extensão `.xls` legado, planilha vazia, só cabeçalho
- [ ] Performance com N mil linhas (limite de memória e tempo)
- [ ] Caracteres especiais, acentos, CPF/CNPJ como texto

## Task 4 — Domínio (join e tabela única)

### Pendências

- [ ] Definir com negócio a política oficial de órfãos (`fail` vs `skip`) no caso de uso de importação
- [ ] Validar **pedido duplicado** (`id` repetido) — hoje não validado
- [ ] Cliente sem pedidos — permitido (não gera linha na tabela única)
- [ ] Mapear `ImportRelationError` → HTTP 422 na API (Task 6)
- [ ] Colunas extras na planilha real (telefone, data do pedido) no modelo unificado

### Testes futuros

- [ ] E2E: fixtures Excel → leitura → `relateClientesPedidos` com órfão (pedido 103 do fixture)
- [ ] Property-based / fuzz em ids e listas grandes
- [ ] Ordenação estável das linhas unificadas (por `pedido_id`) se exigido pelo BI

## Task 5 — Persistência SQL Server

### Pendências

- [ ] **Bulk insert** em lotes (Table-Valued Parameter ou `BULK INSERT`) — hoje 1 INSERT por linha na transação
- [ ] Pool compartilhado com graceful shutdown no `main.ts` (`closeSqlServerPool`)
- [ ] Índices em `import_batch_id` / `cliente_id` se consultas por batch forem frequentes
- [ ] `trustServerCertificate` configurável via env para produção
- [ ] Migrations versionadas (Flyway/dbmate) em vez de DDL inline
- [ ] Rollback de batch (DELETE por `import_batch_id`) em caso de falha parcial downstream (ES)

### Testes futuros

- [ ] `RUN_INTEGRATION=true` no CI com service container SQL Server
- [ ] Concorrência: dois imports simultâneos com batch ids diferentes
- [ ] Violação de PK (mesmo `pedido_id` no mesmo batch) — comportamento SQL
- [ ] Valores decimais, nomes longos (>255), unicode em `cliente_nome`

## Task 6 — API de importação

### Pendências

- [ ] OpenAPI / Swagger do `POST /api/v1/import`
- [ ] Autenticação (API key / JWT) se exigido pela empresa
- [ ] `correlation-id` nos logs por request
- [ ] Resposta 422 com lista de erros por linha da planilha
- [ ] Injetar dependências via factory única (composition root) em `main.ts`
- [ ] Teste E2E real com SQL (sem mock do use case) quando Docker estiver disponível

### Testes futuros

- [ ] `POST /api/v1/import` com planilha inválida → 400 (`ExcelReadError`)
- [ ] Órfãos com `orphanPolicy=fail` → 422
- [ ] Carga concorrente de imports
- [ ] `curl` / Postman collection no README

## Task 7 — Elasticsearch

### Pendências

- [ ] Job de **reindex** quando `elasticsearch.status === 'failed'` no response do import
- [ ] Política configurável: `best_effort` (atual) vs `fail_import_on_es_error`
- [ ] Fechar cliente ES no shutdown; reuso de conexão vs client por request
- [ ] ILM / retention no índice `excel_import_unified`
- [ ] Autenticação ES (API key / basic) em produção
- [ ] Teste de integração `RUN_INTEGRATION` com ES no Compose

### Testes futuros

- [ ] Bulk com milhares de documentos
- [ ] Mapping conflict ao evoluir schema
- [ ] Readiness com SQL ok e ES down → 503 no `/health/ready`

## Task 8 — Produção e operação

### Entregue nesta task

- [x] `X-Request-Id` / correlation id em todas as respostas
- [x] Logs estruturados por request (`onResponse`)
- [x] OpenAPI + Swagger UI em `/docs`
- [x] `IMPORT_MAX_FILE_SIZE_MB` (env, padrão 10, máx. 50)
- [x] Graceful shutdown (`SIGINT`/`SIGTERM`) + `closeSqlServerPool`
- [x] Script `npm run ci` + workflow GitHub Actions
- [x] Erros HTTP incluem `requestId`

### Pendências (pós-MVP)

- [ ] Autenticação (API key / JWT)
- [ ] `@fastify/helmet`, rate limiting
- [ ] Métricas Prometheus / OpenTelemetry
- [ ] Testes E2E com Docker (`RUN_INTEGRATION=true`) no CI
- [ ] Job de reindex ES e políticas configuráveis

### Testes futuros

- [ ] Smoke test manual documentado pós-deploy
- [ ] Chaos: SQL cai durante import
- [ ] Validação de payload OpenAPI contra respostas reais
