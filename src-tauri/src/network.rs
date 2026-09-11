use crate::{
    credentials,
    database::Database,
    models::{GenerationEvent, GenerationInput},
};
use chrono::Utc;
use futures_util::StreamExt;
use reqwest::{Client, redirect::Policy};
use rusqlite::params;
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    net::IpAddr,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Instant,
};
use tauri::{AppHandle, Emitter, State};
use tokio::net::lookup_host;
use url::Url;
use uuid::Uuid;

pub struct Generations(pub Mutex<HashMap<String, Arc<AtomicBool>>>);

fn safe_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v) => {
            !(v.is_private()
                || v.is_loopback()
                || v.is_link_local()
                || v.is_unspecified()
                || v.is_broadcast())
        }
        IpAddr::V6(v) => {
            !(v.is_loopback()
                || v.is_unspecified()
                || v.is_unique_local()
                || v.is_unicast_link_local())
        }
    }
}

async fn validate_destination(base_url: &str) -> Result<Url, String> {
    let url = Url::parse(base_url).map_err(|_| "Provider URL is invalid")?;
    if url.scheme() != "https" {
        return Err("Provider URL must use HTTPS".into());
    }
    let host = url.host_str().ok_or("Provider URL has no hostname")?;
    let port = url.port_or_known_default().unwrap_or(443);
    let addresses = lookup_host((host, port))
        .await
        .map_err(|_| "Provider hostname could not be resolved")?;
    if addresses.into_iter().any(|a| !safe_ip(a.ip())) {
        return Err("Provider resolved to a private or unsafe network address".into());
    }
    Ok(url)
}

fn emit(app: &AppHandle, event: &GenerationEvent) {
    let id = match event {
        GenerationEvent::Delta { request_id, .. }
        | GenerationEvent::Completed { request_id, .. }
        | GenerationEvent::Failed { request_id, .. }
        | GenerationEvent::Cancelled { request_id, .. } => request_id,
    };
    let _ = app.emit(&format!("generation:{id}"), event);
}

#[tauri::command]
pub fn cancel_generation(request_id: String, state: State<'_, Generations>) -> Result<(), String> {
    if let Some(flag) = state
        .0
        .lock()
        .map_err(|_| "Generation state lock failed")?
        .get(&request_id)
    {
        flag.store(true, Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
pub async fn start_generation(
    input: GenerationInput,
    app: AppHandle,
    database: State<'_, Database>,
    state: State<'_, Generations>,
) -> Result<(), String> {
    let cancel = Arc::new(AtomicBool::new(false));
    state
        .0
        .lock()
        .map_err(|_| "Generation state lock failed")?
        .insert(input.request_id.clone(), cancel.clone());
    let id = input.request_id.clone();
    let result = run_generation(&input, &app, &database, cancel).await;
    state
        .0
        .lock()
        .map_err(|_| "Generation state lock failed")?
        .remove(&id);
    if let Err(ref message) = result {
        emit(
            &app,
            &GenerationEvent::Failed {
                request_id: id,
                message: message.clone(),
            },
        );
    }
    result
}

async fn run_generation(
    input: &GenerationInput,
    app: &AppHandle,
    database: &State<'_, Database>,
    cancel: Arc<AtomicBool>,
) -> Result<(), String> {
    if input.message.trim().is_empty() || input.message.len() > 32_000 {
        return Err("Message must be 1–32,000 characters".into());
    }
    let (model, provider_id, provider_name, base_url, headers, input_price, output_price, history) = {
        let db = database.0.lock().map_err(|_| "Database lock failed")?;
        let c=db.query_row("SELECT m.name,p.id,p.name,p.base_url,p.custom_headers,m.input_price_per_million,m.output_price_per_million FROM models m JOIN providers p ON p.id=m.provider_id WHERE m.id=?",[&input.model_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,Option<String>>(4)?,r.get::<_,f64>(5)?,r.get::<_,f64>(6)?))).map_err(|_|"Configured model was not found".to_string())?;
        let mut s = db
            .prepare(
                "SELECT role,content FROM messages WHERE conversation_id=? ORDER BY created_at",
            )
            .map_err(|e| e.to_string())?;
        let h = s
            .query_map([&input.conversation_id], |r| {
                Ok(json!({"role":r.get::<_,String>(0)?,"content":r.get::<_,String>(1)?}))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        (c.0, c.1, c.2, c.3, c.4, c.5, c.6, h)
    };
    let url = validate_destination(&base_url)
        .await?
        .join("chat/completions")
        .map_err(|_| "Unable to create provider request URL")?;
    let key = credentials::load(&provider_id)?;
    let mut messages = Vec::new();
    if let Some(s) = input
        .system_prompt
        .as_ref()
        .filter(|v| !v.trim().is_empty())
    {
        messages.push(json!({"role":"system","content":s}));
    }
    messages.extend(history);
    messages.push(json!({"role":"user","content":input.message}));
    let generation_id = Uuid::new_v4().to_string();
    let user_id = Uuid::new_v4().to_string();
    let started = Utc::now().to_rfc3339();
    {
        let mut db = database.0.lock().map_err(|_| "Database lock failed")?;
        let tx = db.transaction().map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO messages(id,conversation_id,role,content,created_at) VALUES(?,?,'user',?,?)",params![user_id,input.conversation_id,input.message,started]).map_err(|e|e.to_string())?;
        tx.execute("INSERT INTO generations(id,conversation_id,model_id,status,started_at) VALUES(?,?,?,'streaming',?)",params![generation_id,input.conversation_id,input.model_id,started]).map_err(|e|e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
    }
    let client = Client::builder()
        .redirect(Policy::none())
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|_| "Unable to initialize HTTP client")?;
    let mut request=client.post(url).bearer_auth(key).json(&json!({"model":model,"messages":messages,"stream":true,"stream_options":{"include_usage":true},"temperature":input.temperature,"top_p":input.top_p,"max_tokens":input.max_output_tokens}));
    if let Some(raw) = headers {
        if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(&raw) {
            for (name, value) in map {
                if !name.eq_ignore_ascii_case("authorization") {
                    request = request.header(name, value);
                }
            }
        }
    }
    let begin = Instant::now();
    let response = request
        .send()
        .await
        .map_err(|_| "Provider request failed")?;
    if !response.status().is_success() {
        return Err(format!("Provider returned HTTP {}", response.status()));
    }
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut output = String::new();
    let mut ttft = None;
    let mut usage = (None, None);
    while let Some(chunk) = stream.next().await {
        if cancel.load(Ordering::Relaxed) {
            let db = database.0.lock().map_err(|_| "Database lock failed")?;
            db.execute(
                "UPDATE generations SET status='cancelled',completed_at=? WHERE id=?",
                params![Utc::now().to_rfc3339(), generation_id],
            )
            .map_err(|e| e.to_string())?;
            emit(
                app,
                &GenerationEvent::Cancelled {
                    request_id: input.request_id.clone(),
                },
            );
            return Ok(());
        }
        buffer.push_str(&String::from_utf8_lossy(
            &chunk.map_err(|_| "Provider stream was interrupted")?,
        ));
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim_end_matches('\r').to_string();
            buffer.drain(..=pos);
            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    continue;
                }
                if let Ok(value) = serde_json::from_str::<Value>(data) {
                    if let Some(text) = value
                        .pointer("/choices/0/delta/content")
                        .and_then(Value::as_str)
                    {
                        if !text.is_empty() {
                            ttft.get_or_insert(begin.elapsed().as_millis() as i64);
                            output.push_str(text);
                            emit(
                                app,
                                &GenerationEvent::Delta {
                                    request_id: input.request_id.clone(),
                                    text: text.into(),
                                },
                            );
                        }
                    }
                    if let Some(u) = value.get("usage") {
                        usage = (
                            u.get("prompt_tokens").and_then(Value::as_i64),
                            u.get("completion_tokens").and_then(Value::as_i64),
                        );
                    }
                }
            }
        }
    }
    let duration = begin.elapsed().as_millis() as i64;
    let message_id = Uuid::new_v4().to_string();
    let completed = Utc::now().to_rfc3339();
    let total = match usage {
        (Some(a), Some(b)) => Some(a + b),
        _ => None,
    };
    let input_cost = usage.0.map(|v| v as f64 * input_price / 1_000_000.);
    let output_cost = usage.1.map(|v| v as f64 * output_price / 1_000_000.);
    let cost = match (input_cost, output_cost) {
        (Some(a), Some(b)) => Some(a + b),
        _ => None,
    };
    let tps = usage
        .1
        .map(|v| v as f64 / ((duration - ttft.unwrap_or(0)).max(1) as f64 / 1000.));
    {
        let mut db = database.0.lock().map_err(|_| "Database lock failed")?;
        let tx = db.transaction().map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO messages(id,conversation_id,role,content,created_at) VALUES(?,?,'assistant',?,?)",params![message_id,input.conversation_id,output,completed]).map_err(|e|e.to_string())?;
        tx.execute(
            "UPDATE generations SET message_id=?,status='completed',completed_at=? WHERE id=?",
            params![message_id, completed, generation_id],
        )
        .map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO usage_records(id,generation_id,provider_name,model_name,input_tokens,output_tokens,total_tokens,duration_ms,ttft_ms,tokens_per_second,estimated_input_cost,estimated_output_cost,estimated_total_cost,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",params![Uuid::new_v4().to_string(),generation_id,provider_name,model,usage.0,usage.1,total,duration,ttft,tps,input_cost,output_cost,cost,completed]).map_err(|e|e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
    }
    emit(
        app,
        &GenerationEvent::Completed {
            request_id: input.request_id.clone(),
            message_id,
            input_tokens: usage.0,
            output_tokens: usage.1,
            duration_ms: duration,
            ttft_ms: ttft,
            estimated_cost: cost,
        },
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::safe_ip;
    #[test]
    fn blocks_non_public_addresses() {
        for value in [
            "127.0.0.1",
            "10.1.2.3",
            "192.168.1.1",
            "169.254.1.1",
            "::1",
            "fd00::1",
        ] {
            assert!(!safe_ip(value.parse().unwrap()))
        }
    }
    #[test]
    fn allows_public_addresses() {
        assert!(safe_ip("1.1.1.1".parse().unwrap()))
    }
}
