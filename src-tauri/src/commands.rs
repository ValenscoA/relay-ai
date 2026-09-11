use crate::{credentials, database::Database, models::*};
use chrono::Utc;
use rusqlite::{OptionalExtension, params};
use tauri::State;
use uuid::Uuid;

fn db_error(error: rusqlite::Error) -> String {
    format!("Database operation failed: {error}")
}
fn clean_url(value: &str) -> Result<String, String> {
    let value = value.trim().trim_end_matches('/');
    if !value.starts_with("https://") {
        return Err("Provider URL must use HTTPS".into());
    }
    let host = value
        .trim_start_matches("https://")
        .split('/')
        .next()
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    if host.is_empty()
        || host == "localhost"
        || host == "0.0.0.0"
        || host == "::1"
        || host.starts_with("127.")
        || host.starts_with("10.")
        || host.starts_with("192.168.")
        || host.starts_with("169.254.")
    {
        return Err("Private and loopback provider endpoints are not allowed".into());
    }
    Ok(value.to_string())
}

#[tauri::command]
pub fn list_providers(database: State<'_, Database>) -> Result<Vec<Provider>, String> {
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    let mut statement = db.prepare("SELECT id,name,base_url,masked_key,custom_headers,created_at FROM providers ORDER BY name").map_err(db_error)?;
    statement
        .query_map([], |r| {
            Ok(Provider {
                id: r.get(0)?,
                name: r.get(1)?,
                base_url: r.get(2)?,
                masked_key: r.get(3)?,
                custom_headers: r.get(4)?,
                created_at: r.get(5)?,
            })
        })
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)
}

#[tauri::command]
pub fn save_provider(
    input: ProviderInput,
    database: State<'_, Database>,
) -> Result<Provider, String> {
    let name = input.name.trim();
    if name.len() < 2 || name.len() > 60 {
        return Err("Provider name must be 2–60 characters".into());
    }
    let base_url = clean_url(&input.base_url)?;
    let id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let api_key = input.api_key.filter(|v| !v.trim().is_empty());
    if let Some(ref secret) = api_key {
        if secret.len() < 8 {
            return Err("API key is too short".into());
        }
        credentials::save(&id, secret)?;
    }
    let masked = if let Some(ref secret) = api_key {
        format!("••••{}", &secret[secret.len().saturating_sub(4)..])
    } else {
        let db = database.0.lock().map_err(|_| "Database lock failed")?;
        db.query_row("SELECT masked_key FROM providers WHERE id=?", [&id], |r| {
            r.get(0)
        })
        .optional()
        .map_err(db_error)?
        .ok_or("API key is required")?
    };
    let now = Utc::now().to_rfc3339();
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    db.execute("INSERT INTO providers(id,name,base_url,masked_key,custom_headers,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,base_url=excluded.base_url,masked_key=excluded.masked_key,custom_headers=excluded.custom_headers",params![id,name,base_url,masked,input.custom_headers,now]).map_err(db_error)?;
    Ok(Provider {
        id,
        name: name.into(),
        base_url,
        masked_key: masked,
        custom_headers: input.custom_headers,
        created_at: now,
    })
}

#[tauri::command]
pub fn delete_provider(id: String, database: State<'_, Database>) -> Result<(), String> {
    credentials::remove(&id)?;
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    db.execute("DELETE FROM providers WHERE id=?", [id])
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn list_models(database: State<'_, Database>) -> Result<Vec<Model>, String> {
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    let mut s=db.prepare("SELECT m.id,m.provider_id,p.name,m.name,m.display_name,m.input_price_per_million,m.output_price_per_million FROM models m JOIN providers p ON p.id=m.provider_id ORDER BY p.name,m.display_name").map_err(db_error)?;
    s.query_map([], |r| {
        Ok(Model {
            id: r.get(0)?,
            provider_id: r.get(1)?,
            provider_name: r.get(2)?,
            name: r.get(3)?,
            display_name: r.get(4)?,
            input_price_per_million: r.get(5)?,
            output_price_per_million: r.get(6)?,
        })
    })
    .map_err(db_error)?
    .collect::<Result<Vec<_>, _>>()
    .map_err(db_error)
}

#[tauri::command]
pub fn save_model(input: ModelInput, database: State<'_, Database>) -> Result<String, String> {
    if input.name.trim().is_empty() {
        return Err("Model identifier is required".into());
    }
    if input.input_price_per_million < 0. || input.output_price_per_million < 0. {
        return Err("Model pricing cannot be negative".into());
    }
    let id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    db.execute("INSERT INTO models(id,provider_id,name,display_name,input_price_per_million,output_price_per_million) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET provider_id=excluded.provider_id,name=excluded.name,display_name=excluded.display_name,input_price_per_million=excluded.input_price_per_million,output_price_per_million=excluded.output_price_per_million",params![id,input.provider_id,input.name,input.display_name,input.input_price_per_million,input.output_price_per_million]).map_err(db_error)?;
    Ok(id)
}

#[tauri::command]
pub fn create_conversation(
    model_id: Option<String>,
    database: State<'_, Database>,
) -> Result<Conversation, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    db.execute("INSERT INTO conversations(id,title,model_id,created_at,updated_at) VALUES(?,'New conversation',?,?,?)",params![id,model_id,now,now]).map_err(db_error)?;
    Ok(Conversation {
        id,
        title: "New conversation".into(),
        model_id,
        system_prompt: None,
        temperature: 0.7,
        top_p: 1.0,
        max_output_tokens: 2048,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_conversations(database: State<'_, Database>) -> Result<Vec<Conversation>, String> {
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    let mut s=db.prepare("SELECT id,title,model_id,system_prompt,temperature,top_p,max_output_tokens,created_at,updated_at FROM conversations ORDER BY updated_at DESC").map_err(db_error)?;
    s.query_map([], |r| {
        Ok(Conversation {
            id: r.get(0)?,
            title: r.get(1)?,
            model_id: r.get(2)?,
            system_prompt: r.get(3)?,
            temperature: r.get(4)?,
            top_p: r.get(5)?,
            max_output_tokens: r.get(6)?,
            created_at: r.get(7)?,
            updated_at: r.get(8)?,
        })
    })
    .map_err(db_error)?
    .collect::<Result<Vec<_>, _>>()
    .map_err(db_error)
}

#[tauri::command]
pub fn rename_conversation(
    id: String,
    title: String,
    database: State<'_, Database>,
) -> Result<(), String> {
    let title = title.trim();
    if title.is_empty() || title.len() > 120 {
        return Err("Conversation title must be 1–120 characters".into());
    }
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    db.execute(
        "UPDATE conversations SET title=?,updated_at=? WHERE id=?",
        params![title, Utc::now().to_rfc3339(), id],
    )
    .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn delete_conversation(id: String, database: State<'_, Database>) -> Result<(), String> {
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    db.execute("DELETE FROM conversations WHERE id=?", [id])
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn list_messages(
    conversation_id: String,
    database: State<'_, Database>,
) -> Result<Vec<Message>, String> {
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    let mut s=db.prepare("SELECT id,conversation_id,role,content,created_at FROM messages WHERE conversation_id=? ORDER BY created_at").map_err(db_error)?;
    s.query_map([conversation_id], |r| {
        Ok(Message {
            id: r.get(0)?,
            conversation_id: r.get(1)?,
            role: r.get(2)?,
            content: r.get(3)?,
            created_at: r.get(4)?,
        })
    })
    .map_err(db_error)?
    .collect::<Result<Vec<_>, _>>()
    .map_err(db_error)
}

#[tauri::command]
pub fn usage_summary(database: State<'_, Database>) -> Result<UsageSummary, String> {
    let db = database.0.lock().map_err(|_| "Database lock failed")?;
    db.query_row("SELECT COUNT(*),COALESCE(SUM(total_tokens),0),COALESCE(SUM(estimated_total_cost),0),COALESCE(AVG(ttft_ms),0) FROM usage_records",[],|r|Ok(UsageSummary{total_requests:r.get(0)?,total_tokens:r.get(1)?,estimated_spend:r.get(2)?,average_ttft_ms:r.get(3)?})).map_err(db_error)
}

#[cfg(test)]
mod tests {
    use super::clean_url;
    #[test]
    fn rejects_local_networks() {
        for url in [
            "http://api.openai.com/v1",
            "https://localhost/v1",
            "https://127.0.0.1/v1",
            "https://192.168.1.2/v1",
        ] {
            assert!(clean_url(url).is_err())
        }
    }
    #[test]
    fn normalizes_https_urls() {
        assert_eq!(
            clean_url("https://api.openai.com/v1/").unwrap(),
            "https://api.openai.com/v1"
        )
    }
}
