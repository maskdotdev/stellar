use crate::ai::*;
use crate::database::Database;
use tauri::{State, AppHandle, Emitter};
use tokio::sync::Mutex;
use std::sync::Arc;

// Database state type
type DatabaseState = Arc<Mutex<Option<Database>>>;

#[tauri::command]
pub async fn ai_test_connection(
    state: State<'_, DatabaseState>,
    provider: AIProvider,
) -> Result<bool, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    let api_key = database.get_api_key(&provider.id).await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    drop(db_state);

    // Test connection based on provider type
    match provider.r#type.as_str() {
        "openai" | "custom" => test_openai_connection(&provider, api_key).await,
        "anthropic" => test_anthropic_connection(&provider, api_key).await,
        "ollama" => test_ollama_connection(&provider).await,
        _ => Err("Unsupported provider type".to_string()),
    }
}

#[tauri::command]
pub async fn ai_chat_completion(
    state: State<'_, DatabaseState>,
    provider: AIProvider,
    model: String,
    request: ChatCompletionRequest,
) -> Result<ChatCompletionResponse, String> {
    println!(
        "[AI][CMD] chat_completion provider={} type={} model={} messages={} stream={}",
        provider.id,
        provider.r#type,
        model,
        request.messages.len(),
        false
    );
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    let api_key = database.get_api_key(&provider.id).await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    drop(db_state);

    match provider.r#type.as_str() {
        "openai" | "custom" => openai_chat_completion(&provider, &model, &request, api_key).await,
        "anthropic" => anthropic_chat_completion(&provider, &model, &request, api_key).await,
        "ollama" => ollama_chat_completion(&provider, &model, &request).await,
        _ => Err("Unsupported provider type".to_string()),
    }
}

#[tauri::command]
pub async fn ai_chat_completion_stream(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    provider: AIProvider,
    model: String,
    request: ChatCompletionRequest,
    event_name: String,
) -> Result<(), String> {
    println!(
        "[AI][CMD] chat_completion_stream provider={} type={} model={} messages={} event=\"{}\"",
        provider.id,
        provider.r#type,
        model,
        request.messages.len(),
        event_name
    );
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    let api_key = database.get_api_key(&provider.id).await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    drop(db_state);

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
pub async fn ai_get_models(
    state: State<'_, DatabaseState>,
    provider: AIProvider,
) -> Result<Vec<AIModel>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    let api_key = database.get_api_key(&provider.id).await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    drop(db_state);

    match provider.r#type.as_str() {
        "openai" | "custom" => get_openai_models(&provider, api_key).await,
        "anthropic" => get_anthropic_models(&provider, api_key).await,
        "ollama" => get_ollama_models(&provider).await,
        _ => Err("Unsupported provider type".to_string()),
    }
} 