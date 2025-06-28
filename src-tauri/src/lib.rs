use tokio::sync::Mutex;
use std::sync::Arc;

// Import our modules
pub mod ai;
pub mod commands;
pub mod database;
pub mod pdf_processor;

// Re-export types and functions
pub use ai::*;
pub use commands::*;
pub use database::{Database, Document, CreateDocumentRequest, Category, CreateCategoryRequest};
pub use pdf_processor::{PdfProcessor, MarkerOptions};

// Database state
type DatabaseState = Arc<Mutex<Option<Database>>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(DatabaseState::new(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            greet,
            fetch_models_dev_data,
            store_api_key,
            get_api_key,
            delete_api_key,
            ai_test_connection,
            ai_chat_completion,
            ai_chat_completion_stream,
            ai_get_models,
            init_database,
            upload_and_process_pdf,
            upload_and_process_pdf_from_data,
            upload_and_process_pdf_from_url,
            get_pdf_file_path,
            get_pdf_file_content,
            delete_pdf_file,
            create_document,
            get_all_documents,
            get_document,
            update_document,
            delete_document,
            create_category,
            get_all_categories,
            get_category,
            update_category,
            delete_category,
            get_documents_by_category,
            get_uncategorized_documents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
