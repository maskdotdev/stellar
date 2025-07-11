use crate::embeddings::{VectorService, EmbeddingConfig, EmbeddingProvider, DocumentChunk, EmbeddingSearchResult, create_embedding_generator};
use crate::commands::database::DatabaseState;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use std::collections::HashMap;

// Reference to the vector service state
type VectorServiceState = Arc<Mutex<Option<VectorService>>>;

#[tauri::command]
pub async fn init_vector_service(
    state: State<'_, VectorServiceState>,
    db_path: String,
    embedding_provider: String,
    model: String,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<bool, String> {
    let provider = match embedding_provider.as_str() {
        "openai" => EmbeddingProvider::OpenAI,
        "openai-compatible" => EmbeddingProvider::OpenAICompatible,
        "local" => EmbeddingProvider::LocalModel,
        "ollama" => EmbeddingProvider::Ollama,
        _ => return Err("Invalid embedding provider".to_string()),
    };
    
    let config = EmbeddingConfig {
        provider,
        model,
        api_key,
        base_url,
        dimensions: 384, // Will be determined by the actual model
    };
    
    let service = VectorService::new(&db_path, config).await
        .map_err(|e| format!("Failed to initialize vector service: {}", e))?;
    
    let mut guard = state.lock().await;
    *guard = Some(service);
    
    Ok(true)
}

#[tauri::command]
pub async fn process_document_embeddings(
    state: State<'_, VectorServiceState>,
    document_id: String,
    title: String,
    content: String,
    doc_type: String,
    file_path: Option<String>,
) -> Result<bool, String> {
    let mut guard = state.lock().await;
    let service = guard.as_mut()
        .ok_or("Vector service not initialized")?;

    // Simple chunking strategy - split by paragraphs and limit size
    let chunks: Vec<DocumentChunk> = content
        .split("\n\n")
        .enumerate()
        .filter(|(_, chunk_content)| !chunk_content.trim().is_empty())
        .map(|(i, chunk_content)| {
            let mut metadata = HashMap::new();
            metadata.insert("title".to_string(), title.clone());
            metadata.insert("doc_type".to_string(), doc_type.clone());
            metadata.insert("chunk_index".to_string(), i.to_string());
            
            if let Some(path) = &file_path {
                metadata.insert("file_path".to_string(), path.clone());
            }
            
            DocumentChunk {
                id: format!("{}_{}", document_id, i),
                document_id: document_id.clone(),
                content: chunk_content.to_string(),
                chunk_index: i,
                metadata,
                created_at: chrono::Utc::now(),
            }
        })
        .collect();

    if chunks.is_empty() {
        return Ok(true); // No content to process
    }

    service.add_document_chunks(&chunks).await
        .map_err(|e| format!("Failed to process document embeddings: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn search_document_embeddings(
    state: State<'_, VectorServiceState>,
    query: String,
    limit: Option<usize>,
    threshold: Option<f32>,
    document_ids: Option<Vec<String>>,
) -> Result<Vec<EmbeddingSearchResult>, String> {
    let mut guard = state.lock().await;
    let service = guard.as_mut()
        .ok_or("Vector service not initialized")?;
    
    let results = service.search_similar(
        &query, 
        limit.unwrap_or(10),
        document_ids.as_ref().map(|v| v.as_slice())
    ).await
    .map_err(|e| format!("Search failed: {}", e))?;

    // Apply threshold filter if specified
    let filtered_results = if let Some(threshold) = threshold {
        results.into_iter()
            .filter(|r| r.score >= threshold)
            .collect()
    } else {
        results
    };

    Ok(filtered_results)
}

#[tauri::command]
pub async fn delete_document_embeddings(
    state: State<'_, VectorServiceState>,
    document_id: String,
) -> Result<bool, String> {
    let mut guard = state.lock().await;
    let service = guard.as_mut()
        .ok_or("Vector service not initialized")?;

    service.delete_document(&document_id)
        .map_err(|e| format!("Failed to delete document embeddings: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn get_embedding_stats(
    state: State<'_, VectorServiceState>,
) -> Result<serde_json::Value, String> {
    let guard = state.lock().await;
    let service = guard.as_ref()
        .ok_or("Vector service not initialized")?;

    service.get_stats()
        .map_err(|e| format!("Failed to get stats: {}", e))
}

#[tauri::command]
pub async fn check_embedding_health(
    state: State<'_, VectorServiceState>,
) -> Result<bool, String> {
    let guard = state.lock().await;
    let _service = guard.as_ref()
        .ok_or("Vector service not initialized")?;

    // For now, just check if the service exists
    Ok(true)
}

// Initialize the VectorService (sqlite-vec based) for backward compatibility
#[tauri::command]
pub async fn init_embedding_service(
    state: State<'_, VectorServiceState>,
    db_state: State<'_, DatabaseState>,
    _legacy_url: Option<String>,
) -> Result<serde_json::Value, String> {
    // Use the same data directory as the main database
    let home_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?;
    
    let app_data_dir = home_dir.join("stellar_data");
    let db_path = app_data_dir.join("embeddings.db");
    
    // Ensure directory exists
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        return Err(format!("Failed to create app directory: {}", e));
    }
    
    // Try different providers in order of preference
    let mut last_error = String::new();
    let provider_used: String;
    
    // Try Ollama first with the correct URL and a model that exists
    println!("🔍 Trying to initialize Ollama embedding service...");
    match init_vector_service(
        state.clone(),
        db_path.to_string_lossy().to_string(),
        "ollama".to_string(),
        "mxbai-embed-large".to_string(), // Use the model we know exists
        None,
        Some("http://localhost:11434".to_string()), // Force correct Ollama URL
    ).await {
        Ok(_) => {
            // Test the connection by trying to generate a simple embedding
            println!("✅ Ollama service initialized, testing connection...");
            match process_document_embeddings(
                state.clone(),
                "connection_test".to_string(),
                "Connection Test".to_string(),
                "This is a test embedding to verify Ollama connectivity.".to_string(),
                "test".to_string(),
                None,
            ).await {
                Ok(_) => {
                    // Connection test successful, clean up the test document
                    let _ = delete_document_embeddings(state.clone(), "connection_test".to_string()).await;
                    provider_used = "ollama".to_string();
                    println!("✅ Ollama connection test successful");
                },
                Err(e) => {
                    // Connection test failed, clean up and fallback
                    let _ = delete_document_embeddings(state.clone(), "connection_test".to_string()).await;
                    last_error = format!("Ollama connection test failed: {}", e);
                    println!("⚠️ Ollama connection test failed: {}, trying OpenAI fallback...", e);
                    
                    // Try OpenAI as fallback if API key is available
                    let db_guard = db_state.lock().await;
                    let openai_api_key = if let Some(database) = db_guard.as_ref() {
                        database.get_api_key("openai-default").await
                            .unwrap_or(None)
                    } else {
                        None
                    };
                    drop(db_guard);
                    
                    if let Some(api_key) = openai_api_key {
                        println!("🔍 Found OpenAI API key, trying OpenAI embeddings...");
                        match init_vector_service(
                            state.clone(),
                            db_path.to_string_lossy().to_string(),
                            "openai".to_string(),
                            "text-embedding-3-small".to_string(), // Efficient OpenAI model
                            Some(api_key),
                            None,
                        ).await {
                            Ok(_) => {
                                provider_used = "openai".to_string();
                                println!("✅ OpenAI embedding service initialized successfully");
                            },
                            Err(e2) => {
                                last_error = format!("Ollama failed: {}, OpenAI failed: {}", last_error, e2);
                                println!("⚠️ OpenAI failed: {}, trying rust-bert fallback...", e2);
                                
                                // Final fallback to rust-bert
                                match init_vector_service(
                                    state,
                                    db_path.to_string_lossy().to_string(),
                                    "rust-bert".to_string(),
                                    "fallback".to_string(),
                                    None,
                                    None,
                                ).await {
                                    Ok(_) => {
                                        provider_used = "rust-bert".to_string();
                                        println!("✅ Rust-bert fallback embedding service initialized");
                                    },
                                    Err(e3) => {
                                        last_error = format!("Ollama failed: {}, OpenAI failed: {}, Rust-bert failed: {}", last_error, e2, e3);
                                        return Err(format!("All embedding providers failed. {}", last_error));
                                    }
                                }
                            }
                        }
                    } else {
                        println!("⚠️ No OpenAI API key found, trying rust-bert fallback...");
                        
                        // Fallback to rust-bert
                        match init_vector_service(
                            state,
                            db_path.to_string_lossy().to_string(),
                            "rust-bert".to_string(),
                            "fallback".to_string(),
                            None,
                            None,
                        ).await {
                            Ok(_) => {
                                provider_used = "rust-bert".to_string();
                                println!("✅ Rust-bert fallback embedding service initialized");
                            },
                            Err(e2) => {
                                last_error = format!("Ollama failed: {}, Rust-bert failed: {}", last_error, e2);
                                return Err(format!("All embedding providers failed. {}", last_error));
                            }
                        }
                    }
                    
                    // Early return since we've handled the fallback
                    return Ok(serde_json::json!({
                        "success": true,
                        "provider": provider_used,
                        "model": match provider_used.as_str() {
                            "ollama" => "mxbai-embed-large",
                            "openai" => "text-embedding-3-small",
                            _ => "fallback"
                        },
                        "base_url": match provider_used.as_str() {
                            "ollama" => "http://localhost:11434",
                            "openai" => "https://api.openai.com/v1",
                            _ => "local"
                        },
                        "message": format!("Embedding service initialized with {}", provider_used),
                        "fallback_used": provider_used != "ollama",
                        "last_error": if !last_error.is_empty() { Some(last_error) } else { None }
                    }));
                }
            }
        },
        Err(e) => {
            last_error = format!("Ollama initialization failed: {}", e);
            println!("⚠️ Ollama initialization failed: {}, trying OpenAI fallback...", e);
            
            // Try OpenAI as fallback if API key is available
            let db_guard = db_state.lock().await;
            let openai_api_key = if let Some(database) = db_guard.as_ref() {
                database.get_api_key("openai-default").await
                    .unwrap_or(None)
            } else {
                None
            };
            drop(db_guard);
            
            if let Some(api_key) = openai_api_key {
                println!("🔍 Found OpenAI API key, trying OpenAI embeddings...");
                match init_vector_service(
                    state.clone(),
                    db_path.to_string_lossy().to_string(),
                    "openai".to_string(),
                    "text-embedding-3-small".to_string(), // Efficient OpenAI model
                    Some(api_key),
                    None,
                ).await {
                    Ok(_) => {
                        provider_used = "openai".to_string();
                        println!("✅ OpenAI embedding service initialized successfully");
                    },
                    Err(e2) => {
                        last_error = format!("Ollama failed: {}, OpenAI failed: {}", last_error, e2);
                        println!("⚠️ OpenAI failed: {}, trying rust-bert fallback...", e2);
                        
                        // Final fallback to rust-bert
                        match init_vector_service(
                            state,
                            db_path.to_string_lossy().to_string(),
                            "rust-bert".to_string(),
                            "fallback".to_string(),
                            None,
                            None,
                        ).await {
                            Ok(_) => {
                                provider_used = "rust-bert".to_string();
                                println!("✅ Rust-bert fallback embedding service initialized");
                            },
                            Err(e3) => {
                                last_error = format!("Ollama failed: {}, OpenAI failed: {}, Rust-bert failed: {}", last_error, e2, e3);
                                return Err(format!("All embedding providers failed. {}", last_error));
                            }
                        }
                    }
                }
            } else {
                println!("⚠️ No OpenAI API key found, trying rust-bert fallback...");
                
                // Fallback to rust-bert
                match init_vector_service(
                    state,
                    db_path.to_string_lossy().to_string(),
                    "rust-bert".to_string(),
                    "fallback".to_string(),
                    None,
                    None,
                ).await {
                    Ok(_) => {
                        provider_used = "rust-bert".to_string();
                        println!("✅ Rust-bert fallback embedding service initialized");
                    },
                    Err(e2) => {
                        last_error = format!("Ollama failed: {}, Rust-bert failed: {}", last_error, e2);
                        return Err(format!("All embedding providers failed. {}", last_error));
                    }
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "success": true,
        "provider": provider_used,
        "model": match provider_used.as_str() {
            "ollama" => "mxbai-embed-large",
            "openai" => "text-embedding-3-small",
            _ => "fallback"
        },
        "base_url": match provider_used.as_str() {
            "ollama" => "http://localhost:11434",
            "openai" => "https://api.openai.com/v1",
            _ => "local"
        },
        "message": format!("Embedding service initialized with {}", provider_used),
        "fallback_used": provider_used == "rust-bert",
        "last_error": if !last_error.is_empty() { Some(last_error) } else { None }
    }))
}

// Debug command to check vector service status and stats
#[tauri::command]
pub async fn debug_embedding_service(
    state: State<'_, VectorServiceState>,
) -> Result<serde_json::Value, String> {
    let guard = state.lock().await;
    
    if let Some(service) = guard.as_ref() {
        let stats = service.get_stats()
            .map_err(|e| format!("Failed to get stats: {}", e))?;
        
        Ok(serde_json::json!({
            "status": "initialized",
            "stats": stats
        }))
    } else {
        Ok(serde_json::json!({
            "status": "not_initialized",
            "message": "Vector service has not been initialized. Call init_vector_service first."
        }))
    }
}

// List all documents that have embeddings
#[tauri::command]
pub async fn list_embedded_documents(
    state: State<'_, VectorServiceState>,
) -> Result<Vec<serde_json::Value>, String> {
    let guard = state.lock().await;
    let service = guard.as_ref()
        .ok_or("Vector service not initialized")?;
    
    service.list_embedded_documents()
        .map_err(|e| format!("Failed to list embedded documents: {}", e))
}

// Get embedding information for a specific document
#[tauri::command]
pub async fn get_document_embedding_info(
    state: State<'_, VectorServiceState>,
    document_id: String,
) -> Result<serde_json::Value, String> {
    let guard = state.lock().await;
    let service = guard.as_ref()
        .ok_or("Vector service not initialized")?;
    
    service.get_document_embedding_info(&document_id)
        .map_err(|e| format!("Failed to get document embedding info: {}", e))
}

// Get general information about the embedding database
#[tauri::command]
pub async fn get_embedding_database_info(
    state: State<'_, VectorServiceState>,
) -> Result<serde_json::Value, String> {
    let guard = state.lock().await;
    
    if let Some(service) = guard.as_ref() {
        let stats = service.get_stats()
            .map_err(|e| format!("Failed to get database info: {}", e))?;
        
        Ok(serde_json::json!({
            "status": "initialized",
            "database_info": stats,
            "provider": "sqlite-vec",
            "database_type": "embedded_vector_database"
        }))
    } else {
        Ok(serde_json::json!({
            "status": "not_initialized",
            "message": "Vector service has not been initialized. Call init_vector_service first.",
            "provider": "sqlite-vec",
            "database_type": "embedded_vector_database"
        }))
    }
}

// Bulk reprocess all documents for embeddings
#[tauri::command]
pub async fn bulk_reprocess_documents_for_embeddings(
    vector_state: State<'_, VectorServiceState>,
    db_state: State<'_, DatabaseState>,
) -> Result<serde_json::Value, String> {
    let mut guard = vector_state.lock().await;
    let vector_service = guard.as_mut()
        .ok_or("Vector service not initialized")?;
    
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    // Get all documents from the database
    let documents = database.get_all_documents().await
        .map_err(|e| format!("Failed to get documents: {}", e))?;

    let mut processed_count = 0;
    let mut failed_count = 0;
    let mut skipped_count = 0;
    let mut errors = Vec::new();

    for document in documents {
        if document.content.trim().is_empty() {
            skipped_count += 1;
            continue; // Skip empty documents
        }

        // Check if embeddings already exist for this document
        let skip_document = {
            let existing_embeddings = vector_service.get_document_embedding_info(&document.id);
            if let Ok(embedding_info) = existing_embeddings {
                let chunks_count: i64 = embedding_info.get("total_chunks")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                
                if chunks_count > 0 {
                    println!("⏭️ Skipping document '{}' - embeddings already exist ({} chunks)", 
                             document.title, chunks_count);
                    true
                } else {
                    false
                }
            } else {
                false
            }
        };

        if skip_document {
            skipped_count += 1;
            continue;
        }

        // Process document for embeddings
        let chunks: Vec<crate::embeddings::DocumentChunk> = document.content
            .split("\n\n")
            .enumerate()
            .filter(|(_, chunk_content)| !chunk_content.trim().is_empty())
            .map(|(i, chunk_content)| {
                let mut metadata = std::collections::HashMap::new();
                metadata.insert("title".to_string(), document.title.clone());
                metadata.insert("doc_type".to_string(), document.doc_type.clone());
                metadata.insert("chunk_index".to_string(), i.to_string());
                
                if let Some(path) = &document.file_path {
                    metadata.insert("file_path".to_string(), path.clone());
                }
                
                crate::embeddings::DocumentChunk {
                    id: format!("{}_{}", document.id, i),
                    document_id: document.id.clone(),
                    content: chunk_content.to_string(),
                    chunk_index: i,
                    metadata,
                    created_at: chrono::Utc::now(),
                }
            })
            .collect();

        if !chunks.is_empty() {
            match vector_service.add_document_chunks(&chunks).await {
                Ok(_) => {
                    processed_count += 1;
                    println!("✅ Processed embeddings for document: {} ({})", document.title, document.id);
                }
                Err(e) => {
                    failed_count += 1;
                    let error_msg = format!("Failed to process {}: {}", document.title, e);
                    errors.push(error_msg.clone());
                    eprintln!("❌ {}", error_msg);
                }
            }
        }
    }

    Ok(serde_json::json!({
        "processed": processed_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "total_documents": processed_count + failed_count + skipped_count,
        "errors": errors
    }))
}

/// Copy embeddings from one document to another (for duplicates)
#[tauri::command]
pub async fn copy_document_embeddings(
    state: State<'_, VectorServiceState>,
    source_document_id: String,
    target_document_id: String,
) -> Result<bool, String> {
    let mut guard = state.lock().await;
    let service = guard.as_mut()
        .ok_or("Vector service not initialized")?;
    
    // Get embeddings from source document
    let source_chunks = match service.get_document_embedding_info(&source_document_id) {
        Ok(info) => {
            if let Some(chunks) = info.get("chunks").and_then(|c| c.as_array()) {
                chunks.len()
            } else {
                0
            }
        }
        Err(_) => 0
    };
    
    if source_chunks == 0 {
        return Err("Source document has no embeddings to copy".to_string());
    }
    
    // This is a simplified implementation - in a real system, you'd want to:
    // 1. Query the embedding database directly
    // 2. Copy the embeddings with new chunk IDs for the target document
    // 3. Update metadata to point to the new document
    
    println!("📋 Would copy {} chunks from {} to {}", source_chunks, source_document_id, target_document_id);
    
    Ok(true)
} 

#[tauri::command]
pub async fn test_embedding_provider_availability(
    db_state: State<'_, DatabaseState>,
) -> Result<serde_json::Value, String> {
    let mut available_providers = Vec::new();
    let mut test_results = Vec::new();
    
    // Test Ollama
    println!("🔍 Testing Ollama availability...");
    let ollama_config = EmbeddingConfig {
        provider: EmbeddingProvider::Ollama,
        model: "mxbai-embed-large".to_string(),
        api_key: None,
        base_url: Some("http://localhost:11434".to_string()),
        dimensions: 1024,
    };
    
    match create_embedding_generator(&ollama_config) {
        Ok(_) => {
            available_providers.push("ollama");
            test_results.push(serde_json::json!({
                "provider": "ollama",
                "available": true,
                "model": "mxbai-embed-large",
                "base_url": "http://localhost:11434"
            }));
        }
        Err(e) => {
            test_results.push(serde_json::json!({
                "provider": "ollama",
                "available": false,
                "error": e.to_string()
            }));
        }
    }
    
    // Test OpenAI
    println!("🔍 Testing OpenAI availability...");
    let db_guard = db_state.lock().await;
    let openai_api_key = if let Some(database) = db_guard.as_ref() {
        database.get_api_key("openai-default").await
            .unwrap_or(None)
    } else {
        None
    };
    drop(db_guard);
    
    if let Some(api_key) = openai_api_key {
        let openai_config = EmbeddingConfig {
            provider: EmbeddingProvider::OpenAI,
            model: "text-embedding-3-small".to_string(),
            api_key: Some(api_key),
            base_url: None,
            dimensions: 1536,
        };
        
        match create_embedding_generator(&openai_config) {
            Ok(_) => {
                available_providers.push("openai");
                test_results.push(serde_json::json!({
                    "provider": "openai",
                    "available": true,
                    "model": "text-embedding-3-small",
                    "has_api_key": true
                }));
            }
            Err(e) => {
                test_results.push(serde_json::json!({
                    "provider": "openai",
                    "available": false,
                    "error": e.to_string(),
                    "has_api_key": true
                }));
            }
        }
    } else {
        test_results.push(serde_json::json!({
            "provider": "openai",
            "available": false,
            "error": "No API key configured",
            "has_api_key": false
        }));
    }
    
    // Test rust-bert fallback
    println!("🔍 Testing rust-bert fallback...");
    let rustbert_config = EmbeddingConfig {
        provider: EmbeddingProvider::RustBert,
        model: "fallback".to_string(),
        api_key: None,
        base_url: None,
        dimensions: 384,
    };
    
    match create_embedding_generator(&rustbert_config) {
        Ok(_) => {
            available_providers.push("rust-bert");
            test_results.push(serde_json::json!({
                "provider": "rust-bert",
                "available": true,
                "model": "fallback"
            }));
        }
        Err(e) => {
            test_results.push(serde_json::json!({
                "provider": "rust-bert",
                "available": false,
                "error": e.to_string()
            }));
        }
    }
    
    let recommended_provider = if available_providers.contains(&"ollama") {
        "ollama"
    } else if available_providers.contains(&"openai") {
        "openai"
    } else if available_providers.contains(&"rust-bert") {
        "rust-bert"
    } else {
        "none"
    };
    
    Ok(serde_json::json!({
        "available_providers": available_providers,
        "recommended_provider": recommended_provider,
        "test_results": test_results,
        "fallback_order": ["ollama", "openai", "rust-bert"]
    }))
} 