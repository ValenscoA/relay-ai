use rusqlite::Connection;
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager};

pub struct Database(pub Mutex<Connection>, pub PathBuf);

const MIGRATION: &str = r#"
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
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL, model_id TEXT NOT NULL REFERENCES models(id),
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
PRAGMA user_version = 1;
"#;

pub fn open(app: &AppHandle) -> Result<Database, String> {
    let dir: PathBuf = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Unable to create application data directory: {e}"))?;
    let connection = Connection::open(dir.join("relay.sqlite3"))
        .map_err(|e| format!("Unable to open database: {e}"))?;
    connection
        .execute_batch(MIGRATION)
        .map_err(|e| format!("Unable to migrate database: {e}"))?;
    Ok(Database(Mutex::new(connection), dir.join("relay.sqlite3")))
}

#[cfg(test)]
mod tests {
    use super::MIGRATION;
    use rusqlite::Connection;

    #[test]
    fn migration_is_idempotent_and_enables_foreign_keys() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(MIGRATION).unwrap();
        connection.execute_batch(MIGRATION).unwrap();
        let enabled: i64 = connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();
        assert_eq!(enabled, 1);
    }
}
