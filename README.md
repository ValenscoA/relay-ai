# Relay

Relay is a dark-first, multi-provider AI chat workspace built as a portfolio-grade full-stack application. It connects to OpenAI-compatible APIs with user-supplied credentials, streams responses, compares models, and records latency, token, and estimated-cost telemetry.

## Features

- Real upstream SSE streaming with cancellation support
- Provider adapter boundary designed for additional native providers
- Conversation, message, generation, and usage persistence model
- AES-256-GCM encrypted API credentials
- Markdown, GFM, sanitized links, and highlighted code
- Independent model comparison surface and usage analytics
- Responsive developer-tool interface with accessible focus states
- URL allowlisting and private-network SSRF defenses

## Screenshots

Add desktop chat, comparison, usage, and mobile screenshots here before publishing the repository.

## Architecture

The App Router UI calls narrow route handlers. Handlers validate inputs with Zod, resolve encrypted provider configuration from PostgreSQL, construct an adapter, and proxy the actual provider stream. Database tables separate durable chat state from individual generation attempts and their telemetry. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local setup

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run dev
```

Generate `APP_ENCRYPTION_KEY` with `openssl rand -base64 32`. Add every approved provider hostname to `ALLOWED_PROVIDER_HOSTS`; custom URLs are denied unless listed.

## Commands

- `npm run dev` — development server
- `npm run test` — focused business/security tests
- `npm run lint` — ESLint
- `npm run typecheck` — strict TypeScript
- `npm run build` — production build
- `npm run db:generate` / `npm run db:migrate` — schema workflow

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_ENCRYPTION_KEY` | Base64-encoded 32-byte credential encryption key |
| `ALLOWED_PROVIDER_HOSTS` | Comma-separated custom endpoint hostname allowlist |

## Security decisions

Keys stay server-side and are authenticated-encrypted at rest. Provider URLs require HTTPS, deny common loopback/private ranges, reject redirects, and must match an explicit hostname allowlist. Inputs have schema and size limits. Rendered Markdown is sanitized and external links use isolated browsing contexts. Errors do not include credentials.

## Project structure

`src/app` contains routes, `src/components` presentation, `src/providers` adapters, `src/db` relational schema/access, and `src/lib` validation, security, and domain utilities. `drizzle` contains auditable SQL migrations and `docs` contains the architectural rationale.

## Limitations and planned work

This local-first release intentionally has one seeded/local user and OpenAI-compatible providers only. Authentication, native Anthropic/Google adapters, file uploads, conversation branching, tool calling/MCP, RAG, search, failover, routing, and prompt presets fit the existing boundaries but are not silently mocked.
