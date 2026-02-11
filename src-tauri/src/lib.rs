use tokio::sync::Mutex;
use std::sync::Arc;
use tauri::Manager;

// Import our modules
pub mod ai;
pub mod commands;
pub mod database;
pub mod pdf_processor;
pub mod embeddings;
pub mod background_processor;

use commands::*;
use database::Database;
use embeddings::{VectorService, EmbeddingConfig, EmbeddingProvider};
use background_processor::BackgroundProcessor;

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
    check_marker_availability, get_marker_config,
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
pub use database::{Document, CreateDocumentRequest, Category, CreateCategoryRequest};
pub use pdf_processor::{PdfProcessor, MarkerOptions, ExtractOptions, ExtractionMethod};

// State types
type DatabaseState = Arc<Mutex<Option<Database>>>;
type VectorServiceState = Arc<Mutex<Option<VectorService>>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Get managed state
            let db_state: tauri::State<DatabaseState> = app.state();
            let vector_state: tauri::State<VectorServiceState> = app.state();
            
            // Initialize database and services in background
            let db_init = db_state.inner().clone();
            let vector_init = vector_state.inner().clone();
            tauri::async_runtime::spawn(async move {
                // Use same location as database commands: ~/stellar_data/documents.db
                let db_path = match dirs::home_dir() {
                    Some(home) => {
                        let app_dir = home.join("stellar_data");
                        std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
                        app_dir.join("documents.db")
                    }
                    None => {
                        eprintln!("Failed to resolve home directory, using current directory");
                        std::path::PathBuf::from("documents.db")
                    }
                };
                
                let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());
                
                match Database::new(&db_url).await {
                    Ok(database) => {
                        println!("✅ Database initialized successfully");
                        
                        // Initialize vector service
                        let embedding_config = EmbeddingConfig {
                            provider: EmbeddingProvider::RustBert,
                            model: "default".to_string(),
                            api_key: None,
                            base_url: None,
                            dimensions: 384,
                        };
                        let vector_service = VectorService::new(&db_path.to_string_lossy(), embedding_config).await
                            .expect("Failed to initialize vector service");
                        
                        // Set the initialized services
                        {
                            let mut db_guard = db_init.lock().await;
                            *db_guard = Some(database);
                        }
                        
                        {
                            let mut vector_guard = vector_init.lock().await;
                            *vector_guard = Some(vector_service);
                        }
                        
                        println!("✅ Vector service initialized successfully");
                        
                        // Initialize and start background processor
                        let background_processor = BackgroundProcessor::new(db_init.clone(), vector_init.clone());
                        background_processor.start().await;
                        
                        println!("✅ Background processor started successfully");
                    }
                    Err(e) => {
                        eprintln!("❌ Failed to initialize database: {}", e);
                    }
                }
            });
            
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::new(Mutex::new(None)) as DatabaseState)
        .manage(Arc::new(Mutex::new(None)) as VectorServiceState)
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
            download_pdf_from_url_and_process_background,
            save_pdf_from_file_and_process_background,
            save_pdf_from_data_and_process_background,
            save_document_from_data_and_process_background,
            get_pdf_file_path,
            get_pdf_file_content,
            delete_pdf_file,
            check_marker_availability,
            get_marker_config,
            create_document,
            get_all_documents,
            get_document,
            update_document,
            delete_document,
            search_documents,
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
            // Background processing commands
            create_background_pdf_job_from_file,
            create_background_pdf_job_from_data,
            create_background_pdf_job_from_url,
            get_processing_jobs,
            get_processing_jobs_by_status,
            get_processing_job,
            delete_processing_job,
            cancel_processing_job,
            retry_processing_job,
            get_processing_job_stats,
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
            // Background processing commands
            create_background_pdf_job_from_file,
            create_background_pdf_job_from_data,
            create_background_pdf_job_from_url,
            get_processing_jobs,
            get_processing_jobs_by_status,
            get_processing_job,
            delete_processing_job,
            get_processing_job_stats,
            cancel_processing_job,
            retry_processing_job,
            get_document_processing_status,
            get_processing_jobs_by_document_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
