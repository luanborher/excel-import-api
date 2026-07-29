# Pendências e testes futuros

Última atualização após validação com **Docker Compose + SQL Server 2022**.

## Concluído (Docker / integração local)

- [x] SQL Server no Docker Compose + init do database `excel_import`
- [x] API com upload multipart (`Buffer`) no `POST /api/v1/import`
- [x] `ImportRelationError` → HTTP 422 via `AppError`
- [x] Validação de **pedido duplicado** na planilha
- [x] Insert em **chunks** (até 100 linhas por statement)
- [x] Graceful shutdown + `closeSqlServerPool`
- [x] OpenAPI em `/docs`, `X-Request-Id`, limite de upload
- [x] `SQL_SERVER_TRUST_CERTIFICATE` configurável (padrão `true` para dev/Docker)
- [x] Testes de integração: `RUN_INTEGRATION=true npm run test:integration`
- [x] E2E HTTP real (import + `/health/ready`) com SQL no Docker
- [x] Script `npm run fixtures` e quick start no README

## Como rodar integração local

```bash
cp .env.example .env
docker compose up -d
# aguardar container healthy
set RUN_INTEGRATION=true   # PowerShell: $env:RUN_INTEGRATION="true"
npm run test:integration
```

## Backlog (não bloqueia uso local com Docker)

### Excel / domínio

- [ ] Abas nomeadas (`clientes` / `pedidos`) em vez de só a primeira aba
- [ ] Número da linha nos erros de planilha
- [ ] Streaming para planilhas muito grandes
- [ ] Commitar fixtures `.xlsx` estáticos no repositório (hoje gerados por script)
- [ ] Validar `valor` negativo, ids não inteiros, formato de e-mail

### SQL / produção

- [ ] Migrations versionadas (Flyway/dbmate) em vez de DDL inline
- [ ] Índices adicionais se consultas por `cliente_id` forem frequentes
- [ ] Job CI com service container SQL (GitHub Actions)

### API / segurança

- [ ] Autenticação (API key / JWT)
- [ ] `@fastify/helmet`, rate limiting
- [ ] Validação de MIME tipo Excel no upload
- [ ] Métricas (Prometheus / OpenTelemetry)

### Removido do escopo atual

- Elasticsearch (Task 7) — removido da arquitetura simplificada; não há serviço no Compose.

## Testes futuros sugeridos

- [ ] Concorrência: dois imports simultâneos
- [ ] Chaos: SQL indisponível durante import
- [ ] Arquivo corrompido / planilha vazia / só cabeçalho
- [ ] Performance com N mil linhas
