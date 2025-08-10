use crate::database::{Database, Document, CreateDocumentRequest, Category, CreateCategoryRequest};
use crate::commands::pdf::delete_pdf_file;
use tauri::State;
use tokio::sync::Mutex;
use std::sync::Arc;

pub type DatabaseState = Arc<Mutex<Option<Database>>>;

#[tauri::command]
pub async fn init_database(state: State<'_, DatabaseState>) -> Result<(), String> {
    println!("DEBUG: Starting database initialization...");
    
    let mut db_state = state.lock().await;
    
    // Use the user's home directory for app data to remain consistent with existing installs/data
    let home_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?;
    
    let app_data_dir = home_dir.join("stellar_data");
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

// Search commands
#[tauri::command]
pub async fn search_documents(
    state: State<'_, DatabaseState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<Document>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;

    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let limit_val = limit.unwrap_or(25);
    database
        .search_documents(&query, limit_val)
        .await
        .map_err(|e| format!("Failed to search documents: {}", e))
}

// Data cleanup commands for app uninstall/data reset

#[tauri::command]
pub async fn cleanup_all_data(confirm_deletion: bool) -> Result<bool, String> {
    if !confirm_deletion {
        return Err("Deletion not confirmed".to_string());
    }
    
    let home_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?;
    
    let app_data_dir = home_dir.join("stellar_data");
    
    if app_data_dir.exists() {
        std::fs::remove_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to remove data directory: {}", e))?;
        println!("DEBUG: Removed data directory: {:?}", app_data_dir);
    }
    
    // Clean up Python virtual environments - these are in the project root
    // For cleanup, we'll try to find them in the current directory
    let current_dir = std::env::current_dir()
        .unwrap_or_else(|_| std::path::Path::new(".").to_path_buf());
    
    let marker_env = current_dir.join("marker_env");
    if marker_env.exists() {
        if let Err(e) = std::fs::remove_dir_all(&marker_env) {
            println!("DEBUG: Failed to remove marker_env: {}", e);
        } else {
            println!("DEBUG: Removed marker_env directory: {:?}", marker_env);
        }
    }
    
    let markitdown_env = current_dir.join("markitdown_env");
    if markitdown_env.exists() {
        if let Err(e) = std::fs::remove_dir_all(&markitdown_env) {
            println!("DEBUG: Failed to remove markitdown_env: {}", e);
        } else {
            println!("DEBUG: Removed markitdown_env directory: {:?}", markitdown_env);
        }
    }
    
    Ok(true)
}

#[tauri::command]
pub async fn cleanup_database_only(confirm_deletion: bool) -> Result<bool, String> {
    if !confirm_deletion {
        return Err("Deletion not confirmed".to_string());
    }
    
    let home_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?;
    
    let app_data_dir = home_dir.join("stellar_data");
    
    // Only remove database files, keep PDFs
    let db_files = vec!["documents.db", "embeddings.db"];
    
    for db_file in db_files {
        let db_path = app_data_dir.join(db_file);
        if db_path.exists() {
            std::fs::remove_file(&db_path)
                .map_err(|e| format!("Failed to remove {}: {}", db_file, e))?;
            println!("DEBUG: Removed database file: {:?}", db_path);
        }
    }
    
    Ok(true)
}

#[tauri::command]
pub async fn get_data_usage_info() -> Result<serde_json::Value, String> {
    let home_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?;
    
    let app_data_dir = home_dir.join("stellar_data");
    
    let mut total_size = 0u64;
    let mut database_size = 0u64;
    let mut pdf_size = 0u64;
    let mut pdf_count = 0;
    
    if app_data_dir.exists() {
        // Calculate total directory size
        total_size = calculate_dir_size(&app_data_dir)
            .map_err(|e| format!("Failed to calculate directory size: {}", e))?;
        
        // Calculate database size
        for db_file in &["documents.db", "embeddings.db"] {
            let db_path = app_data_dir.join(db_file);
            if db_path.exists() {
                database_size += db_path.metadata()
                    .map_err(|e| format!("Failed to get metadata for {}: {}", db_file, e))?
                    .len();
            }
        }
        
        // Calculate PDF size and count
        let pdf_dir = app_data_dir.join("pdfs");
        if pdf_dir.exists() {
            for entry in std::fs::read_dir(&pdf_dir)
                .map_err(|e| format!("Failed to read PDF directory: {}", e))? {
                let entry = entry.map_err(|e| format!("Failed to read PDF entry: {}", e))?;
                if entry.file_type().map_err(|e| format!("Failed to get file type: {}", e))?.is_file() {
                    pdf_size += entry.metadata()
                        .map_err(|e| format!("Failed to get PDF metadata: {}", e))?
                        .len();
                    pdf_count += 1;
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "dataDirectory": app_data_dir.to_string_lossy(),
        "exists": app_data_dir.exists(),
        "totalSize": total_size,
        "databaseSize": database_size,
        "pdfSize": pdf_size,
        "pdfCount": pdf_count,
        "totalSizeFormatted": format_size(total_size),
        "databaseSizeFormatted": format_size(database_size),
        "pdfSizeFormatted": format_size(pdf_size)
    }))
}

// Helper function to calculate directory size recursively
fn calculate_dir_size(dir: &std::path::Path) -> Result<u64, std::io::Error> {
    let mut total_size = 0u64;
    
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        
        if metadata.is_dir() {
            total_size += calculate_dir_size(&entry.path())?;
        } else {
            total_size += metadata.len();
        }
    }
    
    Ok(total_size)
}

// Helper function to format file sizes
fn format_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size_f = size as f64;
    let mut unit_index = 0;
    
    while size_f >= 1024.0 && unit_index < UNITS.len() - 1 {
        size_f /= 1024.0;
        unit_index += 1;
    }
    
    if unit_index == 0 {
        format!("{} {}", size, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size_f, UNITS[unit_index])
    }
}