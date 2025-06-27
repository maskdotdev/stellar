use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{State, AppHandle, Emitter};
use tokio::sync::Mutex;
use futures_util::StreamExt;
use std::sync::Arc;

// New modules
mod database;
mod pdf_processor;

use database::{Database, Document, CreateDocumentRequest};
use pdf_processor::PdfProcessor;

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

// Database state
type DatabaseState = Arc<Mutex<Option<Database>>>;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Document Management Commands
#[tauri::command]
async fn init_database(state: State<'_, DatabaseState>) -> Result<(), String> {
    println!("DEBUG: Starting database initialization...");
    
    let mut db_state = state.lock().await;
    
    // Use a data directory outside the watched src-tauri folder
    let app_data_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .join("stellar_data");
    let db_path = app_data_dir.join("documents.db");
    
    println!("DEBUG: Database directory: {:?}", app_data_dir);
    println!("DEBUG: Database path: {:?}", db_path);
    
    // Ensure directory exists
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        let error_msg = format!("Failed to create app directory: {}", e);
        println!("DEBUG: {}", error_msg);
        return Err(error_msg);
    }
    
    println!("DEBUG: Directory created successfully");
    
    // Try using the proper SQLite URL format with connection options
    let database_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());
    println!("DEBUG: Database URL: {}", database_url);
    
    let database = Database::new(&database_url).await
        .map_err(|e| {
            let error_msg = format!("Failed to initialize database: {}", e);
            println!("DEBUG: {}", error_msg);
            error_msg
        })?;
    
    println!("DEBUG: Database initialized successfully");
    
    *db_state = Some(database);
    Ok(())
}

#[tauri::command]
async fn upload_and_process_pdf(
    state: State<'_, DatabaseState>,
    file_path: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf called with file_path: {}", file_path);
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained");
    
    // Process the PDF
    let processor = PdfProcessor::new();
    println!("DEBUG: Created PDF processor");
    
    let content = if use_marker.unwrap_or(false) {
        processor.extract_text_smart(&file_path).await
            .map_err(|e| format!("Failed to process PDF with Marker: {:?}", e))?
    } else {
        processor.extract_text_from_pdf(&file_path)
            .map_err(|e| format!("Failed to process PDF: {:?}", e))?
    };
    
    println!("DEBUG: Extracted content length: {}", content.len());
    
    let metadata = processor.extract_metadata(&file_path)
        .map_err(|e| format!("Failed to extract metadata: {:?}", e))?;
    
    println!("DEBUG: Extracted metadata: {:?}", metadata);
    
    // Create document request
    let request = CreateDocumentRequest {
        title: title.unwrap_or(metadata.title),
        content,
        file_path: Some(file_path),
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let result = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e));
    
    println!("DEBUG: Database operation result: {:?}", result.is_ok());
    
    result
}

#[tauri::command]
async fn upload_and_process_pdf_from_url(
    state: State<'_, DatabaseState>,
    url: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf_from_url called with URL: {}", url);
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained");
    
    // Download PDF from URL to a temporary file
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await
        .map_err(|e| format!("Failed to download PDF: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to download PDF: HTTP {}", response.status()));
    }
    
    // Extract filename from URL or use default
    let filename = url
        .split('/')
        .last()
        .and_then(|name| if name.ends_with(".pdf") { Some(name) } else { None })
        .unwrap_or("downloaded.pdf");
    
    // Create temporary directory for downloads
    let temp_dir = std::env::temp_dir().join("stellar_downloads");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let temp_file_path = temp_dir.join(filename);
    
    // Download and save the file
    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read PDF bytes: {}", e))?;
    
    std::fs::write(&temp_file_path, &bytes)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;
    
    println!("DEBUG: Downloaded PDF to: {:?}", temp_file_path);
    
    // Process the PDF
    let processor = PdfProcessor::new();
    
    let content = if use_marker.unwrap_or(false) {
        processor.extract_text_smart(temp_file_path.to_str().unwrap()).await
            .map_err(|e| format!("Failed to process PDF with Marker: {:?}", e))?
    } else {
        processor.extract_text_from_pdf(temp_file_path.to_str().unwrap())
            .map_err(|e| format!("Failed to process PDF: {:?}", e))?
    };
    
    println!("DEBUG: Extracted content length: {}", content.len());
    
    let metadata = processor.extract_metadata(temp_file_path.to_str().unwrap())
        .map_err(|e| format!("Failed to extract metadata: {:?}", e))?;
    
    println!("DEBUG: Extracted metadata: {:?}", metadata);
    
    // Clean up temporary file
    let _ = std::fs::remove_file(&temp_file_path);
    
    // Create document request
    let doc_title = title.unwrap_or_else(|| {
        // Try to extract title from URL or use metadata title
        url.split('/')
            .last()
            .and_then(|name| name.split('.').next())
            .map(|name| name.replace(['_', '-'], " "))
            .unwrap_or(metadata.title)
    });
    
    let request = CreateDocumentRequest {
        title: doc_title,
        content,
        file_path: Some(url), // Store the URL as the file path
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let result = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e));
    
    println!("DEBUG: Database operation result: {:?}", result.is_ok());
    
    result
}

#[tauri::command]
async fn create_document(
    state: State<'_, DatabaseState>,
    request: CreateDocumentRequest,
) -> Result<Document, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.create_document(request).await
        .map_err(|e| format!("Failed to create document: {}", e))
}

#[tauri::command]
async fn get_all_documents(state: State<'_, DatabaseState>) -> Result<Vec<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_all_documents().await
        .map_err(|e| format!("Failed to get documents: {}", e))
}

#[tauri::command]
async fn get_document(state: State<'_, DatabaseState>, id: String) -> Result<Option<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_document(&id).await
        .map_err(|e| format!("Failed to get document: {}", e))
}

#[tauri::command]
async fn update_document(
    state: State<'_, DatabaseState>,
    id: String,
    request: CreateDocumentRequest,
) -> Result<Option<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.update_document(&id, request).await
        .map_err(|e| format!("Failed to update document: {}", e))
}

#[tauri::command]
async fn delete_document(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.delete_document(&id).await
        .map_err(|e| format!("Failed to delete document: {}", e))
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(ApiKeyStore::default())
        .manage(DatabaseState::new(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            greet,
            store_api_key,
            get_api_key,
            delete_api_key,
            ai_test_connection,
            ai_chat_completion,
            ai_chat_completion_stream,
            ai_get_models,
            init_database,
            upload_and_process_pdf,
            upload_and_process_pdf_from_url,
            create_document,
            get_all_documents,
            get_document,
            update_document,
            delete_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
