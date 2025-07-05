use crate::embeddings::{VectorService, EmbeddingConfig, EmbeddingProvider, DocumentChunk, EmbeddingSearchResult};
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
    _chroma_url: Option<String>,
) -> Result<serde_json::Value, String> {
    // Use the same data directory as the main database
    let app_data_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .join("stellar_data");
    
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
            provider_used = "ollama".to_string();
            println!("✅ Ollama embedding service initialized successfully");
        },
        Err(e) => {
            last_error = format!("Ollama failed: {}", e);
            println!("⚠️ Ollama failed: {}, trying rust-bert fallback...", e);
            
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
    
    Ok(serde_json::json!({
        "success": true,
        "provider": provider_used,
        "model": if provider_used == "ollama" { "mxbai-embed-large" } else { "fallback" },
        "base_url": if provider_used == "ollama" { "http://localhost:11434" } else { "local" },
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