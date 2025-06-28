use crate::database::{Database, Document, CreateDocumentRequest, Category, CreateCategoryRequest};
use crate::commands::pdf::delete_pdf_file;
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
    
    // First, get the document to check if it has a PDF file to clean up
    let document = database.get_document(&id).await
        .map_err(|e| format!("Failed to get document for deletion: {}", e))?;
    
    // Delete the document from the database
    let deleted = database.delete_document(&id).await
        .map_err(|e| format!("Failed to delete document: {}", e))?;
    
    // If document was deleted and it's a PDF with a file_path, clean up the PDF file
    if deleted {
        if let Some(doc) = document {
            if doc.doc_type == "pdf" {
                if let Some(file_path) = doc.file_path {
                    // Attempt to delete the PDF file, but don't fail the entire operation if this fails
                    match delete_pdf_file(file_path).await {
                        Ok(_) => println!("DEBUG: Successfully cleaned up PDF file for document {}", id),
                        Err(e) => println!("DEBUG: Failed to clean up PDF file for document {}: {}", id, e),
                    }
                }
            }
        }
    }
    
    Ok(deleted)
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

// Category management commands

#[tauri::command]
pub async fn create_category(
    state: State<'_, DatabaseState>,
    request: CreateCategoryRequest,
) -> Result<Category, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.create_category(request).await
        .map_err(|e| format!("Failed to create category: {}", e))
}

#[tauri::command]
pub async fn get_all_categories(state: State<'_, DatabaseState>) -> Result<Vec<Category>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_all_categories().await
        .map_err(|e| format!("Failed to get categories: {}", e))
}

#[tauri::command]
pub async fn get_category(state: State<'_, DatabaseState>, id: String) -> Result<Option<Category>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_category(&id).await
        .map_err(|e| format!("Failed to get category: {}", e))
}

#[tauri::command]
pub async fn update_category(
    state: State<'_, DatabaseState>,
    id: String,
    request: CreateCategoryRequest,
) -> Result<Option<Category>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.update_category(&id, request).await
        .map_err(|e| format!("Failed to update category: {}", e))
}

#[tauri::command]
pub async fn delete_category(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.delete_category(&id).await
        .map_err(|e| format!("Failed to delete category: {}", e))
}

#[tauri::command]
pub async fn get_documents_by_category(
    state: State<'_, DatabaseState>,
    category_id: String,
) -> Result<Vec<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_documents_by_category(&category_id).await
        .map_err(|e| format!("Failed to get documents by category: {}", e))
}

#[tauri::command]
pub async fn get_uncategorized_documents(state: State<'_, DatabaseState>) -> Result<Vec<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_uncategorized_documents().await
        .map_err(|e| format!("Failed to get uncategorized documents: {}", e))
}