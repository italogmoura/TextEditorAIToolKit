# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

TextEditor AI ToolKit — interface web para workflow jurídico com IA. Permite visualizar processos judiciais (PDFs, peças .docx), editar documentos via Google Docs embeddado em iframe, e executar agentes de IA (Claude Code CLI) para análise e revisão de peças jurídicas.

## Comandos

```bash
pnpm dev             # Inicia dev server (tsx watch server.ts) — porta 3000
pnpm build           # Build Next.js para produção
pnpm lint            # ESLint via Next.js
pnpm test            # Vitest (todos os testes unitários)
pnpm test:unit       # Apenas testes unitários (filesystem, prompt-builder, db)
pnpm test:gdocs      # Testes do client Google Docs (requer service account)
pnpm test:smoke      # Smoke tests (faz build primeiro)
pnpm test:all        # Build + todos os testes
```

Rodar um teste específico: `pnpm vitest run tests/nome.test.ts`

## Arquitetura

### Custom Server (server.ts)
O app **não** usa o dev server padrão do Next.js. `server.ts` cria um HTTP server com Next.js + Socket.io na mesma porta. O comando `pnpm dev` roda `tsx watch server.ts`, não `next dev`. Socket.io é exposto via `globalThis.__socketIO`.

### Estrutura de dados: processos no filesystem
Os processos judiciais vivem em um diretório externo definido por `CLAUDE_DOCS_PATH` (env var). A estrutura é `$CLAUDE_DOCS_PATH/processos/<numero>/` com PDFs, peças (.docx), índices (.md), e notas (.md). O mapeamento Google Docs fica em `.gdocs-meta.json` dentro de cada processo.

### Fluxo de dados
- **Frontend (React/Zustand):** Stores em `src/stores/` (process-store, chat-store, agent-store). Componentes em `src/components/`.
- **API Routes (Next.js):** `src/app/api/` — endpoints REST para processos, documentos, chat, agentes, Google Docs, PDFs.
- **Lib server-side:** `src/lib/claude/` (execução de agentes Claude Code CLI via spawn), `src/lib/gdocs/` (Google Docs/Drive API via service account), `src/lib/filesystem/` (indexação e watch de processos), `src/lib/db/` (SQLite via Drizzle ORM).

### Agentes de IA
O sistema executa agentes do Claude Code CLI (`claude --print`) como subprocessos (`src/lib/claude/agent-runner.ts`). O workflow `/revisar` roda 4 agentes em paralelo: validador-probatorio, critico-judicial, revisor-completude, revisor-estilo. O prompt é montado em `prompt-builder.ts` com contexto do processo (índice, notas, texto do Google Doc).

### Banco de dados
SQLite em `data/app.db` via better-sqlite3 + Drizzle ORM. Schema em `src/lib/db/schema.ts`. Migrations em `drizzle/migrations/`. Tabelas: audit_logs, agent_runs, document_versions.

### Google Docs
Autenticação via service account (JSON key file). O client (`src/lib/gdocs/client.ts`) usa googleapis para criar, ler e manipular documentos. Documentos são embeddados na UI via iframe. Migração de .docx para Google Docs é feita via `src/lib/gdocs/sync.ts`.

## Variáveis de ambiente

- `CLAUDE_DOCS_PATH` — caminho raiz dos processos no filesystem
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` — path para JSON key da service account Google
- `GOOGLE_SHARED_EMAILS` — emails para compartilhar documentos criados (comma-separated)
- `PORT` — porta do servidor (default: 3000)

## Testes

Setup em `tests/setup.ts` aponta `CLAUDE_DOCS_PATH` para `test-data-root/` local. Testes usam Vitest com environment node e timeout de 30s. Path alias `@/` resolve para `src/`.

## Convenções

- UI components via shadcn/ui em `src/components/ui/`, com Tailwind CSS v4.
- Path alias: `@/*` → `./src/*`.
- Idioma da UI e comentários: português brasileiro.
