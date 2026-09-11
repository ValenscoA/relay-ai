# Relay architecture

## Why these boundaries exist

Relay separates product UI, HTTP orchestration, provider behavior, persistence, and domain utilities. The important interview point is that changing a provider protocol should not force changes to chat rendering or the relational model.

```text
React workspace → validated route handler → LLMProvider adapter → external API
                              ↓
                    Drizzle repositories → PostgreSQL
```

`LLMProvider` exposes `streamChat`, `getModels`, and `validateConnection`. The first adapter targets the broadly useful OpenAI wire format. Native providers can later translate Relay's shared messages/config into their APIs without adding provider conditionals to components.

## Data model

- `users` is deliberately present before authentication so ownership is explicit.
- `providers` owns encrypted credentials and endpoint configuration.
- `models` owns provider-specific identifiers and configurable pricing.
- `conversations` owns default generation parameters and ordered messages.
- `generations` represents an attempt, including failed or cancelled work. It is not conflated with the assistant message.
- `usage_records` is one-to-one with a generation and stores denormalized provider/model names so historical analytics remain readable after display names change.

Foreign keys cascade when an aggregate owner is removed. Model deletion is restricted while referenced by generation history. History and analytics access paths are indexed.

## Streaming lifecycle

The browser sends generation configuration but never credentials. The Node route resolves the model/provider, decrypts the key just in time, creates the adapter, and requests an actual SSE stream. It parses complete SSE frames and forwards only content deltas. `AbortSignal` is passed upstream so Stop Generation cancels paid work where the provider honors cancellation.

A full deployment should wrap message creation, generation creation, and final usage persistence in short transactions—never hold a transaction open for the duration of a network stream. Generation status makes partial failures observable.

## Security rationale

AES-256-GCM gives confidentiality and tamper detection; random nonces prevent equal keys from producing equal ciphertext. The application key belongs in secret management, not PostgreSQL. Endpoint validation layers HTTPS, explicit hostname allowlisting, private-address rejection, and redirect rejection. Production hardening should additionally resolve DNS immediately before each request and reject private results to cover DNS rebinding.

The UI sanitizes Markdown after parsing and sets `noopener noreferrer` on external links. Route handlers cap body size and validate every field at the trust boundary. Logs should contain request IDs and stable error codes, never authorization headers, raw provider bodies, or secrets.

## Extension path

Attachments add relational metadata plus object storage; branching uses message parent IDs; native providers add adapters; tools add typed invocation/result tables; RAG adds document/chunk ownership and a vector store; and authentication replaces the local-user bootstrap without changing ownership columns. Routing and failover belong in orchestration above adapters, not inside provider implementations.
