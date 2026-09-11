# Relay desktop architecture

## System shape

```text
React renderer
  ├─ invoke commands ───────────────┐
  └─ generation:<request-id> events │
                                    ▼
Tauri/Rust backend
  ├─ commands.rs   CRUD and native backup orchestration
  ├─ network.rs    validation, provider requests, SSE parser, telemetry
  ├─ database.rs   application-data SQLite connection and migrations
  └─ credentials.rs OS credential-vault boundary
```

The WebView is presentation code. It never receives an API key and cannot make provider requests. Typed wrappers in `src/lib/desktop.ts` are the renderer's only backend contract.

## Persistence design

SQLite is appropriate for a single-user desktop app: it removes an external service, produces atomic local transactions, works offline, and is easy to back up. The normalized tables are:

- `providers`: non-secret endpoint metadata and masked key indicator
- `models`: provider identifiers and configurable pricing
- `conversations`: defaults and lifecycle timestamps
- `messages`: ordered immutable chat content
- `generations`: every attempt, including cancelled/failed attempts
- `usage_records`: one telemetry record per completed generation

Generation attempts are separate from assistant messages so interruption and retry do not corrupt the logical transcript. Writes before and after a stream use short transactions; no database lock is held across provider network time.

The migration is idempotent and guarded by SQLite's `user_version`. Foreign keys are enabled per connection. Cascades delete aggregate children while historical generation references restrict unsafe model deletion.

## Credential storage

The `keyring` crate writes one credential per provider under the application service identifier. SQLite stores only `••••1234`. This is stronger than encrypting keys beside their encryption key and makes backups safe to share structurally. Deleting a provider removes the vault entry first.

## Streaming lifecycle

1. The renderer registers for `generation:<request-id>` before invoking Rust.
2. Rust validates input, loads model metadata/history, resolves the hostname, and retrieves the key.
3. A user message and `streaming` generation row are committed.
4. Rust sends an OpenAI-compatible request and parses complete SSE lines.
5. Content deltas are emitted to the requesting WebView. Compare mode starts independent commands concurrently.
6. Cancellation flips an atomic flag checked between chunks.
7. Completion atomically stores the assistant message, final status, token counts, TTFT, duration, throughput, and estimated costs.

Failures are emitted only to the corresponding request channel, so one comparison column cannot abort another.

## Security boundaries

- HTTPS is mandatory.
- Literal and DNS-resolved private, loopback, link-local, unspecified, and broadcast addresses are denied.
- Redirects are disabled to prevent a public URL redirecting into an internal service.
- Custom headers cannot replace `Authorization`.
- Provider bodies and credentials are not logged.
- Markdown is sanitized and external links are isolated.
- Tauri's CSP permits local assets and IPC, not arbitrary WebView networking.

## Native behavior

The window-state plugin restores position and dimensions. File dialogs are native; export checkpoints and copies the SQLite database, while import validates the schema version before using SQLite's backup API. Credentials intentionally remain device-local.

Keyboard shortcuts live in the renderer because their actions are workspace state transitions. Global system-wide shortcuts are intentionally not registered.

## Extension seams

Native provider traits can replace the current OpenAI-compatible request builder without changing UI events. Attachments add file metadata plus a scoped filesystem capability. Branching can add message parent IDs. Tool calls deserve typed invocation/result tables. Sync/auth should be layered above the local repository instead of replacing it.
