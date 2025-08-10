use crate::background_processor::create_pdf_processing_job;
use crate::database::{Database, ProcessingJob, ProcessingJobStats};
use crate::pdf_processor::MarkerOptions;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

// State types
type DatabaseState = Arc<Mutex<Option<Database>>>;

// Helper function to get PDF storage directory
fn get_pdf_storage_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;

    let storage_dir = home_dir.join("stellar_data").join("pdfs");

    std::fs::create_dir_all(&storage_dir)
        .map_err(|e| format!("Failed to create PDF storage directory: {}", e))?;

    Ok(storage_dir)
}

/// Create a background PDF processing job from file path
#[tauri::command]
pub async fn create_background_pdf_job_from_file(
    db_state: State<'_, DatabaseState>,
    file_path: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    category_id: Option<String>,
    _use_llm: Option<bool>, // Disabled
    force_ocr: Option<bool>,
) -> Result<ProcessingJob, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    // Get storage directory and copy file
    let storage_dir = get_pdf_storage_dir()?;
    let original_filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.pdf");

    let stored_filename = format!("{}-{}", uuid::Uuid::new_v4(), original_filename);
    let stored_path = storage_dir.join(&stored_filename);

    // Copy file to storage
    std::fs::copy(&file_path, &stored_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    // Get processing options
    let processing_options = MarkerOptions {
        extract_images: false,
        force_ocr: force_ocr.unwrap_or(false),
        prefer_marker: true,
    };

    let job = create_pdf_processing_job(
        database,
        "file",
        Some(stored_path.to_string_lossy().to_string()),
        original_filename,
        title,
        tags.unwrap_or_default(),
        category_id,
        Some(processing_options),
    )
    .await?;

    Ok(job)
}

/// Create a background PDF processing job from data
#[tauri::command]
pub async fn create_background_pdf_job_from_data(
    db_state: State<'_, DatabaseState>,
    file_data: Vec<u8>,
    file_name: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    category_id: Option<String>,
    _use_llm: Option<bool>, // Disabled
    force_ocr: Option<bool>,
) -> Result<ProcessingJob, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    // Get storage directory and save file
    let storage_dir = get_pdf_storage_dir()?;
    let stored_filename = format!("{}-{}", uuid::Uuid::new_v4(), file_name);
    let stored_path = storage_dir.join(&stored_filename);

    // Save file data
    std::fs::write(&stored_path, &file_data).map_err(|e| format!("Failed to save file: {}", e))?;

    // Get processing options
    let processing_options = MarkerOptions {
        extract_images: false,
        force_ocr: force_ocr.unwrap_or(false),
        prefer_marker: true,
    };

    let job = create_pdf_processing_job(
        database,
        "data",
        Some(stored_path.to_string_lossy().to_string()),
        &file_name,
        title,
        tags.unwrap_or_default(),
        category_id,
        Some(processing_options),
    )
    .await?;

    Ok(job)
}

/// Create a background PDF processing job from URL
#[tauri::command]
pub async fn create_background_pdf_job_from_url(
    db_state: State<'_, DatabaseState>,
    url: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    category_id: Option<String>,
    _use_llm: Option<bool>, // Disabled
    force_ocr: Option<bool>,
) -> Result<ProcessingJob, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    // Extract filename from URL
    let filename = url
        .split('/')
        .last()
        .and_then(|name| {
            if name.ends_with(".pdf") {
                Some(name)
            } else {
                None
            }
        })
        .unwrap_or("download.pdf");

    // Get processing options
    let processing_options = MarkerOptions {
        extract_images: false,
        force_ocr: force_ocr.unwrap_or(false),
        prefer_marker: true,
    };

    let job = create_pdf_processing_job(
        database,
        "url",
        Some(url.clone()),
        filename,
        title,
        tags.unwrap_or_default(),
        category_id,
        Some(processing_options),
    )
    .await?;

    Ok(job)
}

/// Get all processing jobs
#[tauri::command]
pub async fn get_processing_jobs(
    db_state: State<'_, DatabaseState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<ProcessingJob>, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    database
        .get_processing_jobs(limit, offset)
        .await
        .map_err(|e| format!("Failed to get processing jobs: {}", e))
}

/// Get processing jobs by status
#[tauri::command]
pub async fn get_processing_jobs_by_status(
    db_state: State<'_, DatabaseState>,
    status: String,
) -> Result<Vec<ProcessingJob>, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    database
        .get_processing_jobs_by_status(&status)
        .await
        .map_err(|e| format!("Failed to get processing jobs by status: {}", e))
}

/// Get a specific processing job
#[tauri::command]
pub async fn get_processing_job(
    db_state: State<'_, DatabaseState>,
    job_id: String,
) -> Result<Option<ProcessingJob>, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    database
        .get_processing_job(&job_id)
        .await
        .map_err(|e| format!("Failed to get processing job: {}", e))
}

/// Delete a processing job
#[tauri::command]
pub async fn delete_processing_job(
    db_state: State<'_, DatabaseState>,
    job_id: String,
) -> Result<bool, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    database
        .delete_processing_job(&job_id)
        .await
        .map_err(|e| format!("Failed to delete processing job: {}", e))
}

/// Get processing job statistics
#[tauri::command]
pub async fn get_processing_job_stats(
    db_state: State<'_, DatabaseState>,
) -> Result<ProcessingJobStats, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    database
        .get_processing_job_stats()
        .await
        .map_err(|e| format!("Failed to get processing job stats: {}", e))
}

/// Cancel a processing job (mark as failed)
#[tauri::command]
pub async fn cancel_processing_job(
    db_state: State<'_, DatabaseState>,
    job_id: String,
) -> Result<bool, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    let update = crate::database::ProcessingJobUpdate {
        id: job_id,
        status: Some("failed".to_string()),
        error_message: Some("Cancelled by user".to_string()),
        completed_at: Some(chrono::Utc::now()),
        ..Default::default()
    };

    database
        .update_processing_job(update)
        .await
        .map_err(|e| format!("Failed to cancel processing job: {}", e))?;

    Ok(true)
}

/// Retry a failed processing job
#[tauri::command]
pub async fn retry_processing_job(
    db_state: State<'_, DatabaseState>,
    job_id: String,
) -> Result<bool, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    let update = crate::database::ProcessingJobUpdate {
        id: job_id,
        status: Some("pending".to_string()),
        progress: Some(0),
        error_message: None,
        started_at: None,
        completed_at: None,
        ..Default::default()
    };

    database
        .update_processing_job(update)
        .await
        .map_err(|e| format!("Failed to retry processing job: {}", e))?;

    Ok(true)
}

/// Check if a document has an active processing job (pending or processing)
#[tauri::command]
pub async fn get_document_processing_status(
    db_state: State<'_, DatabaseState>,
    document_id: String,
) -> Result<Option<ProcessingJob>, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    // First check if this document was created from a processing job
    let completed_job = database
        .get_processing_jobs_by_result_document_id(&document_id)
        .await
        .map_err(|e| format!("Failed to get processing jobs: {}", e))?;

    if let Some(job) = completed_job.first() {
        // If the job is still pending or processing, return it
        if job.status == "pending" || job.status == "processing" {
            return Ok(Some(job.clone()));
        }
    }

    Ok(None)
}

/// Get processing jobs by result document ID
#[tauri::command]
pub async fn get_processing_jobs_by_document_id(
    db_state: State<'_, DatabaseState>,
    document_id: String,
) -> Result<Vec<ProcessingJob>, String> {
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;

    database
        .get_processing_jobs_by_result_document_id(&document_id)
        .await
        .map_err(|e| format!("Failed to get processing jobs by document ID: {}", e))
}
