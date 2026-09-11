use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub masked_key: String,
    pub custom_headers: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInput {
    pub id: Option<String>,
    pub name: String,
    pub base_url: String,
    pub api_key: Option<String>,
    pub custom_headers: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub id: String,
    pub provider_id: String,
    pub provider_name: String,
    pub name: String,
    pub display_name: String,
    pub input_price_per_million: f64,
    pub output_price_per_million: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInput {
    pub id: Option<String>,
    pub provider_id: String,
    pub name: String,
    pub display_name: String,
    pub input_price_per_million: f64,
    pub output_price_per_million: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub model_id: Option<String>,
    pub system_prompt: Option<String>,
    pub temperature: f64,
    pub top_p: f64,
    pub max_output_tokens: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummary {
    pub total_requests: i64,
    pub total_tokens: i64,
    pub estimated_spend: f64,
    pub average_ttft_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationInput {
    pub request_id: String,
    pub conversation_id: String,
    pub model_id: String,
    pub message: String,
    pub system_prompt: Option<String>,
    pub temperature: f64,
    pub top_p: f64,
    pub max_output_tokens: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum GenerationEvent {
    Delta {
        request_id: String,
        text: String,
    },
    Completed {
        request_id: String,
        message_id: String,
        input_tokens: Option<i64>,
        output_tokens: Option<i64>,
        duration_ms: i64,
        ttft_ms: Option<i64>,
        estimated_cost: Option<f64>,
    },
    Failed {
        request_id: String,
        message: String,
    },
    Cancelled {
        request_id: String,
    },
}
