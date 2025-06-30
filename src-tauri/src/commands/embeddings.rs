use crate::embeddings::{VectorService, EmbeddingConfig, EmbeddingProvider, DocumentChunk, EmbeddingSearchResult};
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
    chroma_url: Option<String>,
) -> Result<bool, String> {
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
    
    init_vector_service(
        state,
        db_path.to_string_lossy().to_string(),
        "ollama".to_string(),
        "all-minilm".to_string(),
        None,
        chroma_url.or_else(|| Some("http://localhost:11434".to_string())),
    ).await
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