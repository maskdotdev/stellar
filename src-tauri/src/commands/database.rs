use crate::database::{Database, Document, CreateDocumentRequest};
use tauri::State;
use tokio::sync::Mutex;
use std::sync::Arc;

// Database state type
type DatabaseState = Arc<Mutex<Option<Database>>>;

#[tauri::command]
pub async fn init_database(state: State<'_, DatabaseState>) -> Result<(), String> {
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
pub async fn create_document(
    state: State<'_, DatabaseState>,
    request: CreateDocumentRequest,
) -> Result<Document, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.create_document(request).await
        .map_err(|e| format!("Failed to create document: {}", e))
}

#[tauri::command]
pub async fn get_all_documents(state: State<'_, DatabaseState>) -> Result<Vec<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_all_documents().await
        .map_err(|e| format!("Failed to get documents: {}", e))
}

#[tauri::command]
pub async fn get_document(state: State<'_, DatabaseState>, id: String) -> Result<Option<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_document(&id).await
        .map_err(|e| format!("Failed to get document: {}", e))
}

#[tauri::command]
pub async fn update_document(
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
pub async fn delete_document(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.delete_document(&id).await
        .map_err(|e| format!("Failed to delete document: {}", e))
}

#[tauri::command]
pub async fn store_api_key(
    state: State<'_, DatabaseState>,
    provider_id: String,
    api_key: String,
) -> Result<(), String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.store_api_key(&provider_id, &api_key).await
        .map_err(|e| format!("Failed to store API key: {}", e))
}

#[tauri::command]
pub async fn get_api_key(
    state: State<'_, DatabaseState>,
    provider_id: String,
) -> Result<Option<String>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_api_key(&provider_id).await
        .map_err(|e| format!("Failed to get API key: {}", e))
}

#[tauri::command]
pub async fn delete_api_key(
    state: State<'_, DatabaseState>,
    provider_id: String,
) -> Result<(), String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.delete_api_key(&provider_id).await
        .map_err(|e| format!("Failed to delete API key: {}", e))?;
    Ok(())
} 