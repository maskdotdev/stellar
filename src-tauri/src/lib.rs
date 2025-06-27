use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{State, AppHandle, Emitter};
use tokio::sync::Mutex;
use futures_util::StreamExt;

// AI Provider types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIProvider {
    pub id: String,
    pub r#type: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    #[serde(rename = "apiKey", skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIModel {
    pub id: String,
    pub name: String,
    #[serde(rename = "providerId")]
    pub provider_id: String,
    #[serde(rename = "contextWindow")]
    pub context_window: u32,
    #[serde(rename = "maxTokens")]
    pub max_tokens: u32,
    #[serde(rename = "supportsStreaming")]
    pub supports_streaming: bool,
    #[serde(rename = "supportsTools")]
    pub supports_tools: bool,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub messages: Vec<ChatMessage>,
    pub model: String,
    pub temperature: Option<f32>,
    #[serde(rename = "maxTokens")]
    pub max_tokens: Option<u32>,
    #[serde(rename = "topP")]
    pub top_p: Option<f32>,
    #[serde(rename = "frequencyPenalty")]
    pub frequency_penalty: Option<f32>,
    #[serde(rename = "presencePenalty")]
    pub presence_penalty: Option<f32>,
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub choices: Vec<ChatChoice>,
    pub usage: ChatUsage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChoice {
    pub message: ChatMessage,
    #[serde(rename = "finishReason")]
    pub finish_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatUsage {
    #[serde(rename = "promptTokens")]
    pub prompt_tokens: u32,
    #[serde(rename = "completionTokens")]
    pub completion_tokens: u32,
    #[serde(rename = "totalTokens")]
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionStreamChunk {
    pub id: String,
    pub choices: Vec<ChatStreamChoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamChoice {
    pub delta: ChatStreamDelta,
    #[serde(rename = "finishReason")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamDelta {
    pub role: Option<String>,
    pub content: Option<String>,
}

// Secure storage for API keys
type ApiKeyStore = Mutex<HashMap<String, String>>;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn store_api_key(
    state: State<'_, ApiKeyStore>,
    provider_id: String,
    api_key: String,
) -> Result<(), String> {
    let mut store = state.lock().await;
    store.insert(provider_id, api_key);
    Ok(())
}

#[tauri::command]
async fn get_api_key(
    state: State<'_, ApiKeyStore>,
    provider_id: String,
) -> Result<Option<String>, String> {
    let store = state.lock().await;
    Ok(store.get(&provider_id).cloned())
}

#[tauri::command]
async fn delete_api_key(
    state: State<'_, ApiKeyStore>,
    provider_id: String,
) -> Result<(), String> {
    let mut store = state.lock().await;
    store.remove(&provider_id);
    Ok(())
}

#[tauri::command]
async fn ai_test_connection(
    state: State<'_, ApiKeyStore>,
    provider: AIProvider,
) -> Result<bool, String> {
    let store = state.lock().await;
    let api_key = store.get(&provider.id).cloned();
    drop(store);

    // Test connection based on provider type
    match provider.r#type.as_str() {
        "openai" | "custom" => test_openai_connection(&provider, api_key).await,
        "anthropic" => test_anthropic_connection(&provider, api_key).await,
        "ollama" => test_ollama_connection(&provider).await,
        _ => Err("Unsupported provider type".to_string()),
    }
}

#[tauri::command]
async fn ai_chat_completion(
    state: State<'_, ApiKeyStore>,
    provider: AIProvider,
    model: String,
    request: ChatCompletionRequest,
) -> Result<ChatCompletionResponse, String> {
    let store = state.lock().await;
    let api_key = store.get(&provider.id).cloned();
    drop(store);

    match provider.r#type.as_str() {
        "openai" | "custom" => openai_chat_completion(&provider, &model, &request, api_key).await,
        "anthropic" => anthropic_chat_completion(&provider, &model, &request, api_key).await,
        "ollama" => ollama_chat_completion(&provider, &model, &request).await,
        _ => Err("Unsupported provider type".to_string()),
    }
}

#[tauri::command]
async fn ai_chat_completion_stream(
    app: AppHandle,
    state: State<'_, ApiKeyStore>,
    provider: AIProvider,
    model: String,
    request: ChatCompletionRequest,
    event_name: String,
) -> Result<(), String> {
    let store = state.lock().await;
    let api_key = store.get(&provider.id).cloned();
    drop(store);

    // Spawn async task for streaming
    tokio::spawn(async move {
        let result = match provider.r#type.as_str() {
            "openai" | "custom" => openai_chat_completion_stream(&provider, &model, &request, api_key, &event_name, &app).await,
            _ => Err("Streaming not supported for this provider".to_string()),
        };

        if let Err(error) = result {
            let _ = app.emit(&format!("{}_error", event_name), error);
        }
    });

    Ok(())
}

#[tauri::command]
async fn ai_get_models(
    state: State<'_, ApiKeyStore>,
    provider: AIProvider,
) -> Result<Vec<AIModel>, String> {
    let store = state.lock().await;
    let api_key = store.get(&provider.id).cloned();
    drop(store);

    match provider.r#type.as_str() {
        "openai" | "custom" => get_openai_models(&provider, api_key).await,
        "anthropic" => get_anthropic_models(&provider, api_key).await,
        "ollama" => get_ollama_models(&provider).await,
        _ => Err("Unsupported provider type".to_string()),
    }
}

// Provider-specific implementations
async fn test_openai_connection(provider: &AIProvider, api_key: Option<String>) -> Result<bool, String> {
    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    let client = reqwest::Client::new();
    
    let response = client
        .get(&format!("{}/models", provider.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}

async fn test_anthropic_connection(provider: &AIProvider, api_key: Option<String>) -> Result<bool, String> {
    let api_key = api_key.ok_or("API key required for Anthropic provider")?;
    let client = reqwest::Client::new();
    
    let response = client
        .get(&format!("{}/models", provider.base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}

async fn test_ollama_connection(provider: &AIProvider) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get(&format!("{}/api/tags", provider.base_url))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}

async fn openai_chat_completion(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
    api_key: Option<String>,
) -> Result<ChatCompletionResponse, String> {
    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    let client = reqwest::Client::new();
    
    let mut body = serde_json::json!({
        "model": model,
        "messages": request.messages,
    });

    if let Some(temp) = request.temperature {
        body["temperature"] = temp.into();
    }
    if let Some(max_tokens) = request.max_tokens {
        body["max_tokens"] = max_tokens.into();
    }

    let response = client
        .post(&format!("{}/chat/completions", provider.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    response
        .json::<ChatCompletionResponse>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))
}

async fn openai_chat_completion_stream(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
    api_key: Option<String>,
    event_name: &str,
    app: &AppHandle,
) -> Result<(), String> {
    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    let client = reqwest::Client::new();
    
    let mut body = serde_json::json!({
        "model": model,
        "messages": request.messages,
        "stream": true,
    });

    if let Some(temp) = request.temperature {
        body["temperature"] = temp.into();
    }
    if let Some(max_tokens) = request.max_tokens {
        body["max_tokens"] = max_tokens.into();
    }

    let response = client
        .post(&format!("{}/chat/completions", provider.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // Process complete lines
        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..]; // Remove "data: " prefix
            
            if data == "[DONE]" {
                // Send completion event
                let completion_chunk = ChatCompletionStreamChunk {
                    id: uuid::Uuid::new_v4().to_string(),
                    choices: vec![ChatStreamChoice {
                        delta: ChatStreamDelta {
                            role: None,
                            content: None,
                        },
                        finish_reason: Some("stop".to_string()),
                    }],
                };
                let _ = app.emit(event_name, completion_chunk);
                break;
            }

            // Parse JSON chunk
            match serde_json::from_str::<serde_json::Value>(data) {
                Ok(json) => {
                    if let Some(choices) = json["choices"].as_array() {
                        if let Some(choice) = choices.get(0) {
                            let delta = &choice["delta"];
                            let content = delta["content"].as_str();
                            let role = delta["role"].as_str();
                            let finish_reason = choice["finish_reason"].as_str();

                            let chunk = ChatCompletionStreamChunk {
                                id: json["id"].as_str().unwrap_or("").to_string(),
                                choices: vec![ChatStreamChoice {
                                    delta: ChatStreamDelta {
                                        role: role.map(|s| s.to_string()),
                                        content: content.map(|s| s.to_string()),
                                    },
                                    finish_reason: finish_reason.map(|s| s.to_string()),
                                }],
                            };

                            let _ = app.emit(event_name, chunk);
                        }
                    }
                }
                Err(_) => {
                    // Skip malformed JSON
                    continue;
                }
            }
        }
    }

    Ok(())
}

async fn anthropic_chat_completion(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
    api_key: Option<String>,
) -> Result<ChatCompletionResponse, String> {
    let api_key = api_key.ok_or("API key required for Anthropic provider")?;
    
    // Convert OpenAI format to Anthropic format
    let system_message = request.messages.iter()
        .find(|m| m.role == "system")
        .map(|m| m.content.clone());
    
    let messages: Vec<_> = request.messages.iter()
        .filter(|m| m.role != "system")
        .collect();

    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "max_tokens": request.max_tokens.unwrap_or(2048),
    });

    if let Some(system) = system_message {
        body["system"] = system.into();
    }
    if let Some(temp) = request.temperature {
        body["temperature"] = temp.into();
    }

    let client = reqwest::Client::new();
    let response = client
        .post(&format!("{}/messages", provider.base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    // Convert Anthropic response to OpenAI format
    let anthropic_response: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = anthropic_response["content"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ChatCompletionResponse {
        id: anthropic_response["id"].as_str().unwrap_or("").to_string(),
        choices: vec![ChatChoice {
            message: ChatMessage {
                role: "assistant".to_string(),
                content,
            },
            finish_reason: anthropic_response["stop_reason"].as_str().unwrap_or("stop").to_string(),
        }],
        usage: ChatUsage {
            prompt_tokens: anthropic_response["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: anthropic_response["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: 0, // Will be calculated on frontend
        },
    })
}

async fn ollama_chat_completion(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
) -> Result<ChatCompletionResponse, String> {
    let client = reqwest::Client::new();
    
    let body = serde_json::json!({
        "model": model,
        "messages": request.messages,
        "stream": false,
    });

    let response = client
        .post(&format!("{}/api/chat", provider.base_url))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    let ollama_response: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(ChatCompletionResponse {
        id: format!("ollama-{}", uuid::Uuid::new_v4()),
        choices: vec![ChatChoice {
            message: ChatMessage {
                role: "assistant".to_string(),
                content: ollama_response["message"]["content"].as_str().unwrap_or("").to_string(),
            },
            finish_reason: "stop".to_string(),
        }],
        usage: ChatUsage {
            prompt_tokens: 0, // Ollama doesn't provide token counts
            completion_tokens: 0,
            total_tokens: 0,
        },
    })
}

async fn get_openai_models(provider: &AIProvider, api_key: Option<String>) -> Result<Vec<AIModel>, String> {
    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    let client = reqwest::Client::new();
    
    let response = client
        .get(&format!("{}/models", provider.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err("Failed to fetch models".to_string());
    }

    let models_response: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models = models_response["data"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|model| {
            let id = model["id"].as_str().unwrap_or("").to_string();
            AIModel {
                name: id.clone(),
                id: id.clone(),
                provider_id: provider.id.clone(),
                context_window: 4096, // Default, should be updated based on model
                max_tokens: 2048,
                supports_streaming: true,
                supports_tools: true,
                capabilities: vec!["text".to_string()],
            }
        })
        .collect();

    Ok(models)
}

async fn get_anthropic_models(_provider: &AIProvider, _api_key: Option<String>) -> Result<Vec<AIModel>, String> {
    // Anthropic doesn't have a models endpoint, return known models
    Ok(vec![
        AIModel {
            id: "claude-3-5-sonnet-20241022".to_string(),
            name: "Claude 3.5 Sonnet".to_string(),
            provider_id: _provider.id.clone(),
            context_window: 200000,
            max_tokens: 8192,
            supports_streaming: true,
            supports_tools: true,
            capabilities: vec!["text".to_string(), "vision".to_string(), "code".to_string()],
        }
    ])
}

async fn get_ollama_models(provider: &AIProvider) -> Result<Vec<AIModel>, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get(&format!("{}/api/tags", provider.base_url))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err("Failed to fetch models".to_string());
    }

    let models_response: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models = models_response["models"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|model| {
            let name = model["name"].as_str().unwrap_or("").to_string();
            AIModel {
                id: name.clone(),
                name: name.clone(),
                provider_id: provider.id.clone(),
                context_window: 4096, // Default
                max_tokens: 2048,
                supports_streaming: true,
                supports_tools: false,
                capabilities: vec!["text".to_string()],
            }
        })
        .collect();

    Ok(models)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ApiKeyStore::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            store_api_key,
            get_api_key,
            delete_api_key,
            ai_test_connection,
            ai_chat_completion,
            ai_chat_completion_stream,
            ai_get_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
