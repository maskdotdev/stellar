use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time;
use chrono::Utc;


use crate::database::{Database, ProcessingJob, ProcessingJobUpdate, CreateDocumentRequest, CreateProcessingJobRequest};
use crate::pdf_processor::{PdfProcessor, MarkerOptions};
use crate::embeddings::VectorService;

pub struct BackgroundProcessor {
    database: Arc<Mutex<Option<Database>>>,
    vector_service: Arc<Mutex<Option<VectorService>>>,
    pdf_processor: PdfProcessor,
    running: Arc<Mutex<bool>>,
}

impl BackgroundProcessor {
    pub fn new(
        database: Arc<Mutex<Option<Database>>>,
        vector_service: Arc<Mutex<Option<VectorService>>>,
    ) -> Self {
        // Use a longer timeout for background processing to support very large PDFs
        // Default marker URL matches PdfProcessor::new()
        let pdf_processor = PdfProcessor::with_config("http://localhost:8001".to_string(), 6000);

        Self {
            database,
            vector_service,
            pdf_processor,
            running: Arc::new(Mutex::new(false)),
        }
    }

    /// Start the background processing loop
    pub async fn start(&self) {
        let mut is_running = self.running.lock().await;
        if *is_running {
            return; // Already running
        }
        *is_running = true;
        drop(is_running);

        println!("🚀 Starting background PDF processor...");

        // Start the processing loop
        let processor = self.clone();
        tokio::spawn(async move {
            processor.processing_loop().await;
        });
    }

    /// Stop the background processing loop
    pub async fn stop(&self) {
        let mut is_running = self.running.lock().await;
        *is_running = false;
        println!("🛑 Stopping background PDF processor...");
    }

    /// Main processing loop
    async fn processing_loop(&self) {
        let mut interval = time::interval(Duration::from_secs(5)); // Check every 5 seconds
        
        loop {
            interval.tick().await;
            
            // Check if we should stop
            let is_running = self.running.lock().await;
            if !*is_running {
                break;
            }
            drop(is_running);

            // Process next job
            if let Err(e) = self.process_next_job().await {
                eprintln!("❌ Error processing job: {}", e);
            }
        }
        
        println!("✅ Background PDF processor stopped");
    }

    /// Process the next pending job
    async fn process_next_job(&self) -> Result<(), String> {
        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        
        // Get next pending job
        let job = match database.get_next_pending_job().await {
            Ok(Some(job)) => job,
            Ok(None) => return Ok(()), // No pending jobs
            Err(e) => return Err(format!("Failed to get next job: {}", e)),
        };

        drop(db_guard);

        println!("🔄 Processing job: {} ({})", job.id, job.original_filename);

        // Update job status to processing
        let update = ProcessingJobUpdate {
            id: job.id.clone(),
            status: Some("processing".to_string()),
            progress: Some(10),
            started_at: Some(Utc::now()),
            ..Default::default()
        };

        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        database.update_processing_job(update).await
            .map_err(|e| format!("Failed to update job status: {}", e))?;
        drop(db_guard);

        // Process the job based on its type
        let job_id = job.id.clone();
        let job_type = job.job_type.clone();
        
        match job_type.as_str() {
            "pdf_processing" => {
                if let Err(e) = self.process_pdf_job(&job).await {
                    eprintln!("❌ PDF processing failed: {}", e);
                    self.mark_job_failed(&job_id, &e).await?;
                }
            }
            "pdf_content_extraction" => {
                if let Err(e) = self.process_pdf_content_extraction_job(&job).await {
                    eprintln!("❌ PDF content extraction failed: {}", e);
                    self.mark_job_failed(&job_id, &e).await?;
                }
            }
            _ => {
                let error = format!("Unknown job type: {}", job_type);
                eprintln!("❌ {}", error);
                self.mark_job_failed(&job_id, &error).await?;
            }
        }

        Ok(())
    }

    /// Process a PDF processing job
    async fn process_pdf_job(&self, job: &ProcessingJob) -> Result<(), String> {
        // Update progress
        self.update_job_progress(&job.id, 20).await?;

        // Get source file path
        let source_path = match job.source_type.as_str() {
            "file" => job.source_path.clone().ok_or("No source path provided")?,
            "url" => {
                // Download file first
                self.update_job_progress(&job.id, 30).await?;
                self.download_file_from_url(&job.source_path.clone().ok_or("No URL provided")?).await?
            }
            "data" => {
                // File should already be in temp storage
                job.source_path.clone().ok_or("No source path provided")?
            }
            _ => return Err(format!("Unknown source type: {}", job.source_type)),
        };

        // Check if file exists
        if !std::path::Path::new(&source_path).exists() {
            return Err(format!("Source file not found: {}", source_path));
        }

        self.update_job_progress(&job.id, 40).await?;

        // Get processing options
        let processing_options: MarkerOptions = job.processing_options
            .as_ref()
            .and_then(|opts| serde_json::from_value(opts.clone()).ok())
            .unwrap_or_default();

        let marker_options = processing_options;

        self.update_job_progress(&job.id, 50).await?;

        // Process the PDF with Marker; fall back to basic extraction on failure
        let content = match self
            .pdf_processor
            .extract_with_marker(&source_path, marker_options)
            .await
        {
            Ok(text) => text,
            Err(e) => {
                eprintln!(
                    "❌ Marker extraction failed, falling back to basic text extraction: {:?}",
                    e
                );
                self
                    .pdf_processor
                    .extract_text_from_pdf(&source_path)
                    .map_err(|e2| format!(
                        "PDF processing failed (Marker and basic extraction): {:?}",
                        e2
                    ))?
            }
        };

        self.update_job_progress(&job.id, 70).await?;

        // Extract metadata
        let metadata = self.pdf_processor.extract_metadata(&source_path)
            .map_err(|e| format!("Failed to extract metadata: {:?}", e))?;

        // Create document
        let doc_title = job.title.clone().unwrap_or_else(|| metadata.title);
        
        // Extract the actual stored filename from the source path
        let stored_filename = std::path::Path::new(&source_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&job.original_filename);
        
        let request = CreateDocumentRequest {
            title: doc_title,
            content: content.clone(),
            content_hash: None,
            file_path: Some(stored_filename.to_string()),
            doc_type: "pdf".to_string(),
            tags: job.tags.clone(),
            status: Some("processing".to_string()), // Start as processing
            category_id: job.category_id.clone(),
        };

        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        let document = database.create_document(request).await
            .map_err(|e| format!("Failed to create document: {}", e))?;
        drop(db_guard);

        self.update_job_progress(&job.id, 90).await?;

        // Process embeddings
        self.process_embeddings(&document.id).await?;

        // Update document status to ready (processing complete)
        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        
        let update_document_request = CreateDocumentRequest {
            title: document.title.clone(),
            content: document.content.clone(),
            content_hash: document.content_hash.clone(),
            file_path: document.file_path.clone(),
            doc_type: document.doc_type.clone(),
            tags: document.tags.clone(),
            status: Some("ready".to_string()), // Mark as ready when processing is complete
            category_id: document.category_id.clone(),
        };
        
        database.update_document(&document.id, update_document_request).await
            .map_err(|e| format!("Failed to update document status: {}", e))?;

        // Mark job as completed
        let update = ProcessingJobUpdate {
            id: job.id.clone(),
            status: Some("completed".to_string()),
            progress: Some(100),
            result_document_id: Some(document.id.clone()),
            completed_at: Some(Utc::now()),
            ..Default::default()
        };

        database.update_processing_job(update).await
            .map_err(|e| format!("Failed to update job completion: {}", e))?;
        
        drop(db_guard);

        println!("✅ Completed processing job: {} -> Document: {}", job.id, document.id);

        Ok(())
    }

    /// Process a PDF content extraction job (updates existing document)
    async fn process_pdf_content_extraction_job(&self, job: &ProcessingJob) -> Result<(), String> {
        // Update progress
        self.update_job_progress(&job.id, 20).await?;

        // Get existing document ID from metadata
        let existing_document_id = job.metadata
            .as_ref()
            .and_then(|meta| meta.get("existing_document_id"))
            .and_then(|id| id.as_str())
            .ok_or("No existing document ID found in job metadata")?;

        // Get source file path
        let source_path = job.source_path.clone().ok_or("No source path provided")?;

        // Check if file exists
        if !std::path::Path::new(&source_path).exists() {
            return Err(format!("Source file not found: {}", source_path));
        }

        self.update_job_progress(&job.id, 40).await?;

        // Get processing options
        let processing_options: MarkerOptions = job.processing_options
            .as_ref()
            .and_then(|opts| serde_json::from_value(opts.clone()).ok())
            .unwrap_or_default();

        let marker_options = processing_options;

        self.update_job_progress(&job.id, 50).await?;

        // Process the PDF with Marker; fall back to basic extraction on failure
        let content = match self
            .pdf_processor
            .extract_with_marker(&source_path, marker_options)
            .await
        {
            Ok(text) => text,
            Err(e) => {
                eprintln!(
                    "❌ Marker extraction failed, falling back to basic text extraction: {:?}",
                    e
                );
                self
                    .pdf_processor
                    .extract_text_from_pdf(&source_path)
                    .map_err(|e2| format!(
                        "PDF processing failed (Marker and basic extraction): {:?}",
                        e2
                    ))?
            }
        };

        self.update_job_progress(&job.id, 70).await?;

        // Extract metadata
        let metadata = self.pdf_processor.extract_metadata(&source_path)
            .map_err(|e| format!("Failed to extract metadata: {:?}", e))?;

        // Get the existing document
        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        let existing_document = database.get_document(existing_document_id).await
            .map_err(|e| format!("Failed to get existing document: {}", e))?
            .ok_or("Existing document not found")?;

        // Update the document with extracted content
        let update_request = CreateDocumentRequest {
            title: existing_document.title.clone(), // Keep existing title
            content: content.clone(),
            content_hash: None, // Will be calculated automatically
            file_path: existing_document.file_path.clone(),
            doc_type: existing_document.doc_type.clone(),
            tags: existing_document.tags.clone(),
            status: Some("ready".to_string()), // Mark as ready when processing is complete
            category_id: existing_document.category_id.clone(),
        };

        database.update_document(existing_document_id, update_request).await
            .map_err(|e| format!("Failed to update document: {}", e))?;

        self.update_job_progress(&job.id, 90).await?;

        // Process embeddings
        self.process_embeddings(existing_document_id).await?;

        // Mark job as completed
        let update = ProcessingJobUpdate {
            id: job.id.clone(),
            status: Some("completed".to_string()),
            progress: Some(100),
            result_document_id: Some(existing_document_id.to_string()),
            completed_at: Some(Utc::now()),
            ..Default::default()
        };

        database.update_processing_job(update).await
            .map_err(|e| format!("Failed to update job completion: {}", e))?;
        
        drop(db_guard);

        println!("✅ Completed content extraction job: {} -> Updated document: {}", job.id, existing_document_id);

        Ok(())
    }

    /// Download file from URL
    async fn download_file_from_url(&self, url: &str) -> Result<String, String> {
        let client = reqwest::Client::new();
        let response = client.get(url).send().await
            .map_err(|e| format!("Failed to download file: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }

        let bytes = response.bytes().await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        // Save to temporary file
        let temp_dir = std::env::temp_dir().join("stellar_downloads");
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create temp directory: {}", e))?;

        let filename = url.split('/').last().unwrap_or("download.pdf");
        let file_path = temp_dir.join(filename);

        std::fs::write(&file_path, bytes)
            .map_err(|e| format!("Failed to save file: {}", e))?;

        Ok(file_path.to_string_lossy().to_string())
    }

    /// Process embeddings for a document
    async fn process_embeddings(&self, document_id: &str) -> Result<(), String> {
        let vector_guard = self.vector_service.lock().await;
        let _vector_service = vector_guard.as_ref().ok_or("Vector service not initialized")?;

        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        let _document = database.get_document(document_id).await
            .map_err(|e| format!("Failed to get document: {}", e))?
            .ok_or("Document not found")?;

        drop(db_guard);

        // Process embeddings (simplified)
        // This would normally chunk the content and create embeddings
        // For now, we'll just log that embeddings were processed
        println!("📊 Processing embeddings for document: {}", document_id);

        Ok(())
    }

    /// Update job progress
    async fn update_job_progress(&self, job_id: &str, progress: i32) -> Result<(), String> {
        let update = ProcessingJobUpdate {
            id: job_id.to_string(),
            progress: Some(progress),
            ..Default::default()
        };

        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        database.update_processing_job(update).await
            .map_err(|e| format!("Failed to update progress: {}", e))?;

        Ok(())
    }

    /// Mark job as failed
    async fn mark_job_failed(&self, job_id: &str, error: &str) -> Result<(), String> {
        let update = ProcessingJobUpdate {
            id: job_id.to_string(),
            status: Some("failed".to_string()),
            error_message: Some(error.to_string()),
            completed_at: Some(Utc::now()),
            ..Default::default()
        };

        let db_guard = self.database.lock().await;
        let database = db_guard.as_ref().ok_or("Database not initialized")?;
        database.update_processing_job(update).await
            .map_err(|e| format!("Failed to mark job as failed: {}", e))?;

        Ok(())
    }
}

impl Clone for BackgroundProcessor {
    fn clone(&self) -> Self {
        // Match the longer timeout used in new()
        let pdf_processor = PdfProcessor::with_config("http://localhost:8001".to_string(), 6000);

        Self {
            database: Arc::clone(&self.database),
            vector_service: Arc::clone(&self.vector_service),
            pdf_processor,
            running: Arc::clone(&self.running),
        }
    }
}

impl Default for ProcessingJobUpdate {
    fn default() -> Self {
        Self {
            id: String::new(),
            status: None,
            progress: None,
            error_message: None,
            result_document_id: None,
            started_at: None,
            completed_at: None,
            metadata: None,
        }
    }
}

/// Helper function to create a PDF processing job
pub async fn create_pdf_processing_job(
    database: &Database,
    source_type: &str,
    source_path: Option<String>,
    filename: &str,
    title: Option<String>,
    tags: Vec<String>,
    category_id: Option<String>,
    processing_options: Option<MarkerOptions>,
) -> Result<ProcessingJob, String> {
    let options_json = processing_options.map(|opts| 
        serde_json::to_value(opts).unwrap_or_default()
    );

    let request = CreateProcessingJobRequest {
        job_type: "pdf_processing".to_string(),
        source_type: source_type.to_string(),
        source_path,
        original_filename: filename.to_string(),
        title,
        tags,
        category_id,
        processing_options: options_json,
        metadata: None,
    };

    database.create_processing_job(request).await
        .map_err(|e| format!("Failed to create processing job: {}", e))
} 