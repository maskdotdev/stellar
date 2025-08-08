use super::types::*;
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;
use uuid::Uuid;
use std::time::{Duration, Instant};
use serde_json::json;

// Provider-specific implementations
pub async fn test_openai_connection(provider: &AIProvider, api_key: Option<String>) -> Result<bool, String> {
    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    
    let response = client
        .get(&format!("{}/models", provider.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}

pub async fn test_anthropic_connection(provider: &AIProvider, api_key: Option<String>) -> Result<bool, String> {
    let api_key = api_key.ok_or("API key required for Anthropic provider")?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    
    let response = client
        .get(&format!("{}/models", provider.base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}

pub async fn test_ollama_connection(provider: &AIProvider) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    
    let response = client
        .get(&format!("{}/api/tags", provider.base_url))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    Ok(response.status().is_success())
}

pub async fn openai_chat_completion(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
    api_key: Option<String>,
) -> Result<ChatCompletionResponse, String> {
    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .connect_timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    println!(
        "[AI] OpenAI chat start model={} messages={} temp={:?} max_tokens={:?}",
        model,
        request.messages.len(),
        request.temperature,
        request.max_tokens
    );
    let started_at = Instant::now();
    
    // Helper to build request body with a specific token parameter name
    let build_body = |token_param: &str| {
        let mut b = serde_json::json!({
            "model": model,
            "messages": request.messages,
        });
        if let Some(temp) = request.temperature { b["temperature"] = temp.into(); }
        if let Some(max_tokens) = request.max_tokens { b[token_param] = max_tokens.into(); }
        b
    };

    // Build final response with fallback handling inside a scoped block to avoid moves
    let response = {
        let initial_body = build_body("max_tokens");
        let resp = client
            .post(&format!("{}/chat/completions", provider.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&initial_body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if resp.status().is_success() {
            resp
        } else {
            let status_code = resp.status();
            let error_text = match resp.text().await { Ok(t) => t, Err(_) => String::new() };
            if error_text.contains("Unsupported parameter") && error_text.contains("max_tokens") {
                println!("[AI] OpenAI retrying with max_completion_tokens due to unsupported max_tokens");
                let body_alt = build_body("max_completion_tokens");
                client
                    .post(&format!("{}/chat/completions", provider.base_url))
                    .header("Authorization", format!("Bearer {}", api_key))
                    .header("Content-Type", "application/json")
                    .json(&body_alt)
                    .send()
                    .await
                    .map_err(|e| format!("Request failed: {}", e))?
            } else {
                println!("[AI] OpenAI API error: status={}, body={}", status_code, error_text);
                return Err(format!("API error: {}", error_text));
            }
        }
    };

    // Parse OpenAI response manually to handle snake_case to camelCase conversion
    let openai_response: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = openai_response["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let elapsed_ms = started_at.elapsed().as_millis();
    let result = ChatCompletionResponse {
        id: openai_response["id"].as_str().unwrap_or("").to_string(),
        choices: vec![ChatChoice {
            message: ChatMessage {
                role: "assistant".to_string(),
                content,
            },
            finish_reason: openai_response["choices"][0]["finish_reason"].as_str().unwrap_or("stop").to_string(),
        }],
        usage: ChatUsage {
            prompt_tokens: openai_response["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: openai_response["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: openai_response["usage"]["total_tokens"].as_u64().unwrap_or(0) as u32,
        },
    };
    println!(
        "[AI] OpenAI chat done model={} elapsed={}ms usage={{prompt:{}, completion:{}, total:{}}}",
        model,
        elapsed_ms,
        result.usage.prompt_tokens,
        result.usage.completion_tokens,
        result.usage.total_tokens
    );
    Ok(result)
}

pub async fn openai_chat_completion_stream(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
    api_key: Option<String>,
    event_name: &str,
    app: &AppHandle,
) -> Result<(), String> {
    // Route GPT-5 models to the Responses API streaming handler
    if model.contains("gpt-5") {
        return openai_responses_stream(provider, model, request, api_key, event_name, app).await;
    }

    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    // For streaming, avoid a global timeout; keep a connect timeout only
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    println!(
        "[AI] OpenAI stream start model={} messages={} temp={:?} max_tokens={:?}",
        model,
        request.messages.len(),
        request.temperature,
        request.max_tokens
    );
    
    // Helper to build body with given token param name
    let build_body = |token_param: &str| {
        let mut b = serde_json::json!({
            "model": model,
            "messages": request.messages,
            "stream": true,
        });
        if let Some(temp) = request.temperature { b["temperature"] = temp.into(); }
        if let Some(max_tokens) = request.max_tokens { b[token_param] = max_tokens.into(); }
        b
    };

    // Build final streaming response with fallback in a scoped block
    let response = {
        let initial_body = build_body("max_tokens");
        let resp = client
            .post(&format!("{}/chat/completions", provider.base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&initial_body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if resp.status().is_success() {
            resp
        } else {
            let status_code = resp.status();
            let error_text = match resp.text().await { Ok(t) => t, Err(_) => String::new() };
            if error_text.contains("Unsupported parameter") && error_text.contains("max_tokens") {
                println!("[AI] OpenAI stream retrying with max_completion_tokens due to unsupported max_tokens");
                let body_alt = build_body("max_completion_tokens");
                client
                    .post(&format!("{}/chat/completions", provider.base_url))
                    .header("Authorization", format!("Bearer {}", api_key))
                    .header("Content-Type", "application/json")
                    .json(&body_alt)
                    .send()
                    .await
                    .map_err(|e| format!("Request failed: {}", e))?
            } else {
                println!("[AI] OpenAI stream API error: status={}, body={}", status_code, error_text);
                return Err(format!("API error: {}", error_text));
            }
        }
    };

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

            if line.is_empty() || !line.starts_with("data:") {
                continue;
            }

            // Remove "data:" prefix and a single optional space
            let mut data = &line[5..];
            if let Some(rest) = data.strip_prefix(' ') { data = rest; }
            
            if data == "[DONE]" {
                // Send completion event
                let completion_chunk = ChatCompletionStreamChunk {
                    id: Uuid::new_v4().to_string(),
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

    println!("[AI] OpenAI stream complete model={}", model);
    Ok(())
}

// Streaming via OpenAI Responses API (GPT-5 family)
async fn openai_responses_stream(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
    api_key: Option<String>,
    event_name: &str,
    app: &AppHandle,
) -> Result<(), String> {
    let api_key = api_key.ok_or("API key required for OpenAI provider")?;
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    println!(
        "[AI] OpenAI Responses stream start model={} messages={} temp={:?} max_tokens={:?}",
        model,
        request.messages.len(),
        request.temperature,
        request.max_tokens
    );

    // Map legacy ChatCompletionRequest to Responses API input schema
    let mut input_items: Vec<serde_json::Value> = Vec::new();
    for msg in &request.messages {
        match msg.role.as_str() {
            "system" => {
                input_items.push(json!({
                    "role": "system",
                    "content": [{ "type": "input_text", "text": msg.content }]
                }));
            }
            "user" => {
                input_items.push(json!({
                    "role": "user",
                    "content": [{ "type": "input_text", "text": msg.content }]
                }));
            }
            "assistant" => {
                input_items.push(json!({
                    "role": "assistant",
                    "content": [{ "type": "output_text", "text": msg.content }]
                }));
            }
            _ => {}
        }
    }

    let mut body = json!({
        "model": model,
        "input": input_items,
        "text": { "format": { "type": "text" } },
        "stream": true
    });
    // GPT-5 Responses API models may not support temperature; omit to avoid errors
    if let Some(max_tokens) = request.max_tokens { body["max_output_tokens"] = max_tokens.into(); }

    let response = client
        .post(&format!("{}/responses", provider.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status_code = response.status();
        let error_text = response.text().await.unwrap_or_default();
        println!("[AI] OpenAI Responses API error: status={}, body={}", status_code, error_text);
        return Err(format!("API error: {}", error_text));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut assembled = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();
            if line.is_empty() || !line.starts_with("data:") { continue; }
            let mut data = &line[5..];
            if let Some(rest) = data.strip_prefix(' ') { data = rest; }
            if data == "[DONE]" { break; }

            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                // Responses API stream events
                // Common event types include: response.output_text.delta, response.output_text.done, response.completed
                let event_type = json["type"].as_str().unwrap_or("");
                match event_type {
                    "response.output_text.delta" => {
                        if let Some(delta) = json["delta"].as_str() {
                            assembled.push_str(delta);
                            let chunk = ChatCompletionStreamChunk {
                                id: json["id"].as_str().unwrap_or("").to_string(),
                                choices: vec![ChatStreamChoice {
                                    delta: ChatStreamDelta { role: Some("assistant".to_string()), content: Some(delta.to_string()) },
                                    finish_reason: None,
                                }],
                            };
                            let _ = app.emit(event_name, chunk);
                        }
                    }
                    "response.completed" | "response.output_text.done" => {
                        let chunk = ChatCompletionStreamChunk {
                            id: json["id"].as_str().unwrap_or("").to_string(),
                            choices: vec![ChatStreamChoice {
                                delta: ChatStreamDelta { role: None, content: None },
                                finish_reason: Some("stop".to_string()),
                            }],
                        };
                        let _ = app.emit(event_name, chunk);
                    }
                    _ => {
                        // Ignore other event types for now
                    }
                }
            }
        }
    }

    println!("[AI] OpenAI Responses stream complete model={}", model);
    Ok(())
}

pub async fn anthropic_chat_completion(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
    api_key: Option<String>,
) -> Result<ChatCompletionResponse, String> {
    let api_key = api_key.ok_or("API key required for Anthropic provider")?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .connect_timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    println!(
        "[AI] Anthropic chat start model={} messages={} temp={:?} max_tokens={:?}",
        model,
        request.messages.len(),
        request.temperature,
        request.max_tokens
    );
    let started_at = Instant::now();
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

    let content = anthropic_response["content"][0]["text"].as_str().unwrap_or("").to_string();
    let elapsed_ms = started_at.elapsed().as_millis();
    let result = ChatCompletionResponse {
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
            total_tokens: (anthropic_response["usage"]["input_tokens"].as_u64().unwrap_or(0)
                + anthropic_response["usage"]["output_tokens"].as_u64().unwrap_or(0)) as u32,
        },
    };
    println!(
        "[AI] Anthropic chat done model={} elapsed={}ms usage={{prompt:{}, completion:{}, total:{}}}",
        model,
        elapsed_ms,
        result.usage.prompt_tokens,
        result.usage.completion_tokens,
        result.usage.total_tokens
    );
    Ok(result)
}

pub async fn ollama_chat_completion(
    provider: &AIProvider,
    model: &str,
    request: &ChatCompletionRequest,
) -> Result<ChatCompletionResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    
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
        id: format!("ollama-{}", Uuid::new_v4()),
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

pub async fn get_openai_models(provider: &AIProvider, api_key: Option<String>) -> Result<Vec<AIModel>, String> {
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

pub async fn get_anthropic_models(provider: &AIProvider, _api_key: Option<String>) -> Result<Vec<AIModel>, String> {
    // Anthropic doesn't have a models endpoint, return known models
    Ok(vec![
        AIModel {
            id: "claude-3-5-sonnet-20241022".to_string(),
            name: "Claude 3.5 Sonnet".to_string(),
            provider_id: provider.id.clone(),
            context_window: 200000,
            max_tokens: 8192,
            supports_streaming: true,
            supports_tools: true,
            capabilities: vec!["text".to_string(), "vision".to_string(), "code".to_string()],
        }
    ])
}

pub async fn get_ollama_models(provider: &AIProvider) -> Result<Vec<AIModel>, String> {
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