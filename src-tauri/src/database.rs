use rusqlite::Connection;
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager};

pub struct Database(pub Mutex<Connection>, pub PathBuf);

const SCHEMA: &str = r#"
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, base_url TEXT NOT NULL,
  masked_key TEXT NOT NULL, custom_headers TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY, provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL, display_name TEXT NOT NULL,
  input_price_per_million REAL NOT NULL DEFAULT 0 CHECK(input_price_per_million >= 0),
  output_price_per_million REAL NOT NULL DEFAULT 0 CHECK(output_price_per_million >= 0),
  UNIQUE(provider_id, name)
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, model_id TEXT REFERENCES models(id) ON DELETE SET NULL,
  system_prompt TEXT, temperature REAL NOT NULL DEFAULT .7 CHECK(temperature BETWEEN 0 AND 2),
  top_p REAL NOT NULL DEFAULT 1 CHECK(top_p BETWEEN 0 AND 1), max_output_tokens INTEGER NOT NULL DEFAULT 2048,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('system','user','assistant')), content TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL, model_id TEXT REFERENCES models(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK(status IN ('streaming','completed','failed','cancelled')),
  error_code TEXT, started_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY, generation_id TEXT NOT NULL UNIQUE REFERENCES generations(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL, model_name TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER,
  total_tokens INTEGER, duration_ms INTEGER NOT NULL, ttft_ms INTEGER, tokens_per_second REAL,
  estimated_input_cost REAL, estimated_output_cost REAL, estimated_total_cost REAL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS usage_created_idx ON usage_records(created_at DESC);
PRAGMA user_version = 2;
"#;

const MIGRATE_V1_TO_V2: &str = r#"
PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;
ALTER TABLE usage_records RENAME TO usage_records_v1;
ALTER TABLE generations RENAME TO generations_v1;
CREATE TABLE generations (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL, model_id TEXT REFERENCES models(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK(status IN ('streaming','completed','failed','cancelled')),
  error_code TEXT, started_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE usage_records (
  id TEXT PRIMARY KEY, generation_id TEXT NOT NULL UNIQUE REFERENCES generations(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL, model_name TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER,
  total_tokens INTEGER, duration_ms INTEGER NOT NULL, ttft_ms INTEGER, tokens_per_second REAL,
  estimated_input_cost REAL, estimated_output_cost REAL, estimated_total_cost REAL, created_at TEXT NOT NULL
);
INSERT INTO generations SELECT * FROM generations_v1;
INSERT INTO usage_records SELECT * FROM usage_records_v1;
DROP TABLE usage_records_v1;
DROP TABLE generations_v1;
CREATE INDEX IF NOT EXISTS usage_created_idx ON usage_records(created_at DESC);
PRAGMA user_version = 2;
COMMIT;
PRAGMA foreign_keys = ON;
"#;

fn migrate(connection: &Connection) -> Result<(), rusqlite::Error> {
    let version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    match version {
        0 => connection.execute_batch(SCHEMA),
        1 => connection.execute_batch(MIGRATE_V1_TO_V2),
        2 => connection.execute_batch("PRAGMA foreign_keys = ON"),
        _ => Err(rusqlite::Error::InvalidQuery),
    }
}

pub fn open(app: &AppHandle) -> Result<Database, String> {
    let dir: PathBuf = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Unable to create application data directory: {e}"))?;
    let connection = Connection::open(dir.join("relay.sqlite3"))
        .map_err(|e| format!("Unable to open database: {e}"))?;
    migrate(&connection).map_err(|e| format!("Unable to migrate database: {e}"))?;
    Ok(Database(Mutex::new(connection), dir.join("relay.sqlite3")))
}

#[cfg(test)]
mod tests {
    use super::{MIGRATE_V1_TO_V2, SCHEMA, migrate};
    use rusqlite::{Connection, OptionalExtension};

    #[test]
    fn migration_is_idempotent_and_enables_foreign_keys() {
        let connection = Connection::open_in_memory().unwrap();
        migrate(&connection).unwrap();
        migrate(&connection).unwrap();
        let enabled: i64 = connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();
        assert_eq!(enabled, 1);
    }

    #[test]
    fn v1_migration_preserves_history_when_a_model_is_deleted() {
        let connection = Connection::open_in_memory().unwrap();
        let v1_schema = SCHEMA
            .replace(
                "message_id TEXT REFERENCES messages(id) ON DELETE SET NULL, model_id TEXT REFERENCES models(id) ON DELETE SET NULL",
                "message_id TEXT REFERENCES messages(id) ON DELETE SET NULL, model_id TEXT NOT NULL REFERENCES models(id)",
            )
            .replace("PRAGMA user_version = 2", "PRAGMA user_version = 1");
        connection.execute_batch(&v1_schema).unwrap();
        connection
            .execute_batch(
                "INSERT INTO providers VALUES('p','Provider','https://example.com/v1','••••test',NULL,'now');
                 INSERT INTO models VALUES('m','p','model','Model',0,0);
                 INSERT INTO conversations(id,title,created_at,updated_at) VALUES('c','Chat','now','now');
                 INSERT INTO generations VALUES('g','c',NULL,'m','failed',NULL,'now','now');",
            )
            .unwrap();

        connection.execute_batch(MIGRATE_V1_TO_V2).unwrap();
        connection
            .execute("DELETE FROM providers WHERE id='p'", [])
            .unwrap();

        let model_id: Option<String> = connection
            .query_row("SELECT model_id FROM generations WHERE id='g'", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(model_id, None);
        assert_eq!(
            connection
                .query_row("PRAGMA foreign_key_check", [], |_| Ok(()))
                .optional()
                .unwrap(),
            None
        );
    }
}
