use tokio::sync::Mutex;
use std::sync::Arc;

// Import our modules
pub mod ai;
pub mod commands;
pub mod database;
pub mod pdf_processor;
pub mod embeddings;

// Re-export types and functions
pub use ai::*;
// Import specific items from commands to avoid conflicts
pub use commands::{
    greet, fetch_models_dev_data, ai_test_connection, ai_chat_completion, ai_chat_completion_stream, ai_get_models,
    init_database, create_document, get_all_documents, get_document, update_document, delete_document,
    create_category, get_all_categories, get_category, update_category, delete_category, 
    get_documents_by_category, get_uncategorized_documents,
    upload_and_process_pdf, upload_and_process_pdf_from_data, upload_and_process_pdf_from_url,
    get_pdf_file_path, get_pdf_file_content, delete_pdf_file,
    create_study_session, get_active_session, end_study_session, get_study_session, get_study_sessions,
    record_user_action, get_actions_by_session, get_actions_by_document, get_recent_actions,
    get_action_statistics, start_new_session, record_simple_action, debug_database_state,
    store_api_key, get_api_key, delete_api_key,
    create_flashcard, get_flashcard, get_flashcards, get_flashcards_by_deck, get_flashcards_by_category,
    get_flashcards_by_document, update_flashcard, delete_flashcard, create_flashcard_deck,
    get_flashcard_deck, get_flashcard_decks, update_flashcard_deck, delete_flashcard_deck,
    record_flashcard_review, get_due_flashcards, get_new_flashcards, get_flashcard_review_session,
    get_flashcard_stats, get_flashcard_reviews, get_flashcard_reviews_by_session,
    cleanup_all_data, cleanup_database_only, get_data_usage_info,
};
pub use commands::embeddings::{
    init_vector_service, init_embedding_service, process_document_embeddings,
    search_document_embeddings, delete_document_embeddings, get_embedding_stats,
    check_embedding_health, debug_embedding_service, list_embedded_documents,
    get_document_embedding_info, get_embedding_database_info, 
    bulk_reprocess_documents_for_embeddings, copy_document_embeddings,
    test_embedding_provider_availability
};
pub use database::{Database, Document, CreateDocumentRequest, Category, CreateCategoryRequest};
pub use pdf_processor::{PdfProcessor, MarkerOptions, ExtractOptions, ExtractionMethod};
pub use embeddings::VectorService;

// State types
type DatabaseState = Arc<Mutex<Option<Database>>>;
type VectorServiceState = Arc<Mutex<Option<VectorService>>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(DatabaseState::new(Mutex::new(None)))
        .manage(VectorServiceState::new(Mutex::new(None)))
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
            get_uncategorized_documents,
            // Student Pro - Actions & Sessions commands
            create_study_session,
            get_active_session,
            end_study_session,
            get_study_session,
            get_study_sessions,
            record_user_action,
            get_actions_by_session,
            get_actions_by_document,
            get_recent_actions,
            get_action_statistics,
            start_new_session,
            record_simple_action,
            debug_database_state,
            // 🧠 PHASE 2: Flashcard System commands
            create_flashcard,
            get_flashcard,
            get_flashcards,
            get_flashcards_by_deck,
            get_flashcards_by_category,
            get_flashcards_by_document,
            update_flashcard,
            delete_flashcard,
            create_flashcard_deck,
            get_flashcard_deck,
            get_flashcard_decks,
            update_flashcard_deck,
            delete_flashcard_deck,
            record_flashcard_review,
            get_due_flashcards,
            get_new_flashcards,
            get_flashcard_review_session,
            get_flashcard_stats,
            get_flashcard_reviews,
            get_flashcard_reviews_by_session,
            // Embedding commands (new sqlite-vec based)
            init_vector_service,
            init_embedding_service, // Keep for backward compatibility
            process_document_embeddings,
            search_document_embeddings,
            delete_document_embeddings,
            get_embedding_stats,
            check_embedding_health,
            debug_embedding_service,
            list_embedded_documents,
            get_document_embedding_info,
            get_embedding_database_info,
            bulk_reprocess_documents_for_embeddings,
            copy_document_embeddings,
            test_embedding_provider_availability,
            cleanup_all_data,
            cleanup_database_only,
            get_data_usage_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
