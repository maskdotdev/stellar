use crate::database::{Database, Document, CreateDocumentRequest};
use crate::pdf_processor::{PdfProcessor, MarkerOptions};
use crate::embeddings::VectorService;
use tauri::State;
use tokio::sync::Mutex;
use std::sync::Arc;
use std::path::PathBuf;
use uuid::Uuid;

// State types
type DatabaseState = Arc<Mutex<Option<Database>>>;
type VectorServiceState = Arc<Mutex<Option<VectorService>>>;

// Helper function to get PDF storage directory
fn get_pdf_storage_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir()
        .ok_or("Could not find home directory")?;
    
    let storage_dir = home_dir.join("stellar_data").join("pdfs");
    
    std::fs::create_dir_all(&storage_dir)
        .map_err(|e| format!("Failed to create PDF storage directory: {}", e))?;
    
    Ok(storage_dir)
}

// Helper function to generate unique filename
fn generate_pdf_filename(original_name: &str) -> String {
    let uuid = Uuid::new_v4();
    let extension = std::path::Path::new(original_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("pdf");
    
    format!("{}.{}", uuid, extension)
}

#[tauri::command]
pub async fn upload_and_process_pdf(
    db_state: State<'_, DatabaseState>,
    vector_state: State<'_, VectorServiceState>,
    file_path: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
    use_enhanced: Option<bool>,
    use_markitdown: Option<bool>,
    category_id: Option<String>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf called with file_path: {}", file_path);
    
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained");
    
    // Get storage directory and generate unique filename
    let storage_dir = get_pdf_storage_dir()?;
    let original_filename = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.pdf");
    let stored_filename = generate_pdf_filename(original_filename);
    let stored_path = storage_dir.join(&stored_filename);
    
    // Copy the file to persistent storage
    std::fs::copy(&file_path, &stored_path)
        .map_err(|e| format!("Failed to copy PDF to storage: {}", e))?;
    
    println!("DEBUG: PDF copied to persistent storage: {:?}", stored_path);
    
    // Process the PDF
    let processor = PdfProcessor::new();
    println!("DEBUG: Created PDF processor");
    
    // Determine processing method based on options
    let content = if use_marker.unwrap_or(false) {
        let marker_options = MarkerOptions {
            extract_images: false,
            use_llm: true,
            format_lines: true,
            force_ocr: false,
            prefer_marker: true,
        };
        processor.extract_with_marker(&file_path, marker_options).await
            .map_err(|e| format!("Failed to process PDF with Marker: {:?}", e))?
    } else if use_markitdown.unwrap_or(false) {
        processor.extract_with_markitdown(&file_path).await
            .map_err(|e| format!("Failed to process PDF with MarkItDown: {:?}", e))?
    } else if use_enhanced.unwrap_or(true) {
        // Use enhanced processing by default
        processor.extract_text_from_pdf(&file_path)
            .map_err(|e| format!("Failed to process PDF with enhanced method: {:?}", e))?
    } else {
        // Basic processing
        processor.extract_basic_text(&file_path)
            .map_err(|e| format!("Failed to process PDF with basic method: {:?}", e))?
    };
    
    println!("DEBUG: Extracted content length: {}", content.len());
    
    let metadata = processor.extract_metadata(&file_path)
        .map_err(|e| format!("Failed to extract metadata: {:?}", e))?;
    
    println!("DEBUG: Extracted metadata: {:?}", metadata);
    
    // Check for duplicate content before processing
    let duplicate_check = database.check_for_duplicate(&content).await
        .map_err(|e| format!("Failed to check for duplicates: {}", e))?;
    
    if let Some(ref existing_doc) = duplicate_check {
        println!("🔍 Duplicate content detected! Existing document: {} ({})", existing_doc.title, existing_doc.id);
        
        // For now, we'll still create the new document but won't process embeddings
        // In the future, we could ask the user what to do
    }
    
    // Clean up temporary processing file
    let _ = std::fs::remove_file(&stored_path);
    
    let doc_title = title.unwrap_or(metadata.title);
    
    let request = CreateDocumentRequest {
        title: doc_title,
        content: content.clone(),
        content_hash: None, // Will be calculated automatically
        file_path: Some(stored_filename), // Store the unique filename
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
        category_id,
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let document = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e))?;
    
    println!("DEBUG: Document saved to database: {}", document.id);
    
    // Process embeddings if service is available and not a duplicate
    let mut vector_guard = vector_state.lock().await;
    if let Some(vector_service) = vector_guard.as_mut() {
        // Check if we found a duplicate earlier
        if let Some(ref existing_doc) = duplicate_check {
            println!("🔄 Attempting to reuse embeddings from existing document: {}", existing_doc.id);
            
            // Check if the existing document has embeddings
            let has_embeddings = {
                match vector_service.get_document_embedding_info(&existing_doc.id) {
                    Ok(embedding_info) => {
                        let chunks_count: i64 = embedding_info.get("total_chunks")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);
                        
                        if chunks_count > 0 {
                            println!("♻️ Found {} existing chunks, skipping embedding generation for duplicate", chunks_count);
                            true
                        } else {
                            println!("⚠️ Existing document has no embeddings, processing new ones");
                            false
                        }
                    }
                    Err(_) => {
                        println!("⚠️ Could not check existing embeddings, processing new ones");
                        false
                    }
                }
            };
            
            if !has_embeddings {
                process_document_embeddings_internal(vector_service, &document).await?;
            }
        } else {
            // No duplicate found, process normally
            process_document_embeddings_internal(vector_service, &document).await?;
        }
    } else {
        println!("DEBUG: Vector service not available, skipping embedding generation");
    }
    
    Ok(document)
}

// Helper function to process embeddings for a document
async fn process_document_embeddings_internal(
    vector_service: &mut crate::embeddings::VectorService,
    document: &crate::database::types::Document
) -> Result<(), String> {
    // Simple chunking - split by paragraphs
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
                println!("✅ Embeddings processed successfully for document: {}", document.id);
                Ok(())
            }
            Err(e) => {
                eprintln!("❌ Failed to process embeddings for document {}: {}", document.id, e);
                Err(format!("Failed to process embeddings: {}", e))
            }
        }
    } else {
        println!("⚠️ No content chunks found for embedding");
        Ok(())
    }
}

#[tauri::command]
pub async fn upload_and_process_pdf_from_data(
    db_state: State<'_, DatabaseState>,
    vector_state: State<'_, VectorServiceState>,
    file_data: Vec<u8>,
    file_name: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
    use_enhanced: Option<bool>,
    use_markitdown: Option<bool>,
    category_id: Option<String>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf_from_data called with file_name: {}", file_name);
    
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained, file size: {} bytes", file_data.len());
    
    // Get storage directory and generate unique filename
    let storage_dir = get_pdf_storage_dir()?;
    let stored_filename = generate_pdf_filename(&file_name);
    let stored_path = storage_dir.join(&stored_filename);
    
    // Write the file data to persistent storage
    std::fs::write(&stored_path, &file_data)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;
    
    println!("DEBUG: Saved PDF to persistent storage: {:?}", stored_path);
    
    // Create temporary file for processing (some processors might need file path)
    let temp_dir = std::env::temp_dir().join("stellar_processing");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let temp_file_path = temp_dir.join(&file_name);
    std::fs::write(&temp_file_path, &file_data)
        .map_err(|e| format!("Failed to create temp processing file: {}", e))?;
    
    // Process the PDF
    let processor = PdfProcessor::new();
    
    // Determine processing method based on options
    let content = if use_marker.unwrap_or(false) {
        let marker_options = MarkerOptions {
            extract_images: false,
            use_llm: true,
            format_lines: true,
            force_ocr: false,
            prefer_marker: true,
        };
        processor.extract_with_marker(temp_file_path.to_str().unwrap(), marker_options).await
            .map_err(|e| format!("Failed to process PDF with Marker: {:?}", e))?
    } else if use_markitdown.unwrap_or(false) {
        processor.extract_with_markitdown(temp_file_path.to_str().unwrap()).await
            .map_err(|e| format!("Failed to process PDF with MarkItDown: {:?}", e))?
    } else if use_enhanced.unwrap_or(true) {
        // Use enhanced processing by default
        processor.extract_text_from_pdf(temp_file_path.to_str().unwrap())
            .map_err(|e| format!("Failed to process PDF with enhanced method: {:?}", e))?
    } else {
        // Basic processing
        processor.extract_basic_text(temp_file_path.to_str().unwrap())
            .map_err(|e| format!("Failed to process PDF with basic method: {:?}", e))?
    };
    
    println!("DEBUG: Extracted content length: {}", content.len());
    
    let metadata = processor.extract_metadata(temp_file_path.to_str().unwrap())
        .map_err(|e| format!("Failed to extract metadata: {:?}", e))?;
    
    println!("DEBUG: Extracted metadata: {:?}", metadata);
    
    // Check for duplicate content before processing
    let duplicate_check = database.check_for_duplicate(&content).await
        .map_err(|e| format!("Failed to check for duplicates: {}", e))?;
    
    if let Some(ref existing_doc) = duplicate_check {
        println!("🔍 Duplicate content detected! Existing document: {} ({})", existing_doc.title, existing_doc.id);
        
        // For now, we'll still create the new document but won't process embeddings
        // In the future, we could ask the user what to do
    }
    
    // Clean up temporary processing file
    let _ = std::fs::remove_file(&temp_file_path);
    
    let doc_title = title.unwrap_or(metadata.title);
    
    let request = CreateDocumentRequest {
        title: doc_title,
        content: content.clone(),
        content_hash: None, // Will be calculated automatically
        file_path: Some(stored_filename), // Store the unique filename
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
        category_id,
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let document = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e))?;
    
    println!("DEBUG: Document saved to database: {}", document.id);
    
    // Process embeddings if service is available and not a duplicate
    let mut vector_guard = vector_state.lock().await;
    if let Some(vector_service) = vector_guard.as_mut() {
        // Check if we found a duplicate earlier
        if let Some(ref existing_doc) = duplicate_check {
            println!("🔄 Attempting to reuse embeddings from existing document: {}", existing_doc.id);
            
            // Check if the existing document has embeddings
            let has_embeddings = {
                match vector_service.get_document_embedding_info(&existing_doc.id) {
                    Ok(embedding_info) => {
                        let chunks_count: i64 = embedding_info.get("total_chunks")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);
                        
                        if chunks_count > 0 {
                            println!("♻️ Found {} existing chunks, skipping embedding generation for duplicate", chunks_count);
                            true
                        } else {
                            println!("⚠️ Existing document has no embeddings, processing new ones");
                            false
                        }
                    }
                    Err(_) => {
                        println!("⚠️ Could not check existing embeddings, processing new ones");
                        false
                    }
                }
            };
            
            if !has_embeddings {
                process_document_embeddings_internal(vector_service, &document).await?;
            }
        } else {
            // No duplicate found, process normally
            process_document_embeddings_internal(vector_service, &document).await?;
        }
    } else {
        println!("DEBUG: Vector service not available, skipping embedding generation");
    }
    
    Ok(document)
}

#[tauri::command]
pub async fn upload_and_process_pdf_from_url(
    db_state: State<'_, DatabaseState>,
    vector_state: State<'_, VectorServiceState>,
    url: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
    use_enhanced: Option<bool>,
    use_markitdown: Option<bool>,
    category_id: Option<String>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf_from_url called with URL: {}", url);
    
    let db_guard = db_state.lock().await;
    let database = db_guard.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained");
    
    // Download PDF from URL
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await
        .map_err(|e| format!("Failed to download PDF: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to download PDF: HTTP {}", response.status()));
    }
    
    // Extract filename from URL or use default
    let filename = url
        .split('/')
        .last()
        .and_then(|name| if name.ends_with(".pdf") { Some(name) } else { None })
        .unwrap_or("downloaded.pdf");
    
    // Get storage directory and generate unique filename
    let storage_dir = get_pdf_storage_dir()?;
    let stored_filename = generate_pdf_filename(filename);
    let stored_path = storage_dir.join(&stored_filename);
    
    // Download and save the file to persistent storage
    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read PDF bytes: {}", e))?;
    
    std::fs::write(&stored_path, &bytes)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;
    
    println!("DEBUG: Downloaded PDF to persistent storage: {:?}", stored_path);
    
    // Create temporary file for processing
    let temp_dir = std::env::temp_dir().join("stellar_processing");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let temp_file_path = temp_dir.join(filename);
    std::fs::write(&temp_file_path, &bytes)
        .map_err(|e| format!("Failed to create temp processing file: {}", e))?;
    
    // Process the PDF
    let processor = PdfProcessor::new();
    
    // Determine processing method based on options
    let content = if use_marker.unwrap_or(false) {
        let marker_options = MarkerOptions {
            extract_images: false,
            use_llm: true,
            format_lines: true,
            force_ocr: false,
            prefer_marker: true,
        };
        processor.extract_with_marker(temp_file_path.to_str().unwrap(), marker_options).await
            .map_err(|e| format!("Failed to process PDF with Marker: {:?}", e))?
    } else if use_markitdown.unwrap_or(false) {
        processor.extract_with_markitdown(temp_file_path.to_str().unwrap()).await
            .map_err(|e| format!("Failed to process PDF with MarkItDown: {:?}", e))?
    } else if use_enhanced.unwrap_or(true) {
        // Use enhanced processing by default
        processor.extract_text_from_pdf(temp_file_path.to_str().unwrap())
            .map_err(|e| format!("Failed to process PDF with enhanced method: {:?}", e))?
    } else {
        // Basic processing
        processor.extract_basic_text(temp_file_path.to_str().unwrap())
            .map_err(|e| format!("Failed to process PDF with basic method: {:?}", e))?
    };
    
    println!("DEBUG: Extracted content length: {}", content.len());
    
    let metadata = processor.extract_metadata(temp_file_path.to_str().unwrap())
        .map_err(|e| format!("Failed to extract metadata: {:?}", e))?;
    
    println!("DEBUG: Extracted metadata: {:?}", metadata);
    
    // Check for duplicate content before processing
    let duplicate_check = database.check_for_duplicate(&content).await
        .map_err(|e| format!("Failed to check for duplicates: {}", e))?;
    
    if let Some(ref existing_doc) = duplicate_check {
        println!("🔍 Duplicate content detected! Existing document: {} ({})", existing_doc.title, existing_doc.id);
        
        // For now, we'll still create the new document but won't process embeddings
        // In the future, we could ask the user what to do
    }
    
    // Clean up temporary processing file
    let _ = std::fs::remove_file(&temp_file_path);
    
    let doc_title = title.unwrap_or(metadata.title);
    
    let request = CreateDocumentRequest {
        title: doc_title,
        content: content.clone(),
        content_hash: None, // Will be calculated automatically
        file_path: Some(stored_filename), // Store the unique filename
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
        category_id,
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let document = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e))?;
    
    println!("DEBUG: Document saved to database: {}", document.id);
    
    // Process embeddings if service is available and not a duplicate
    let mut vector_guard = vector_state.lock().await;
    if let Some(vector_service) = vector_guard.as_mut() {
        // Check if we found a duplicate earlier
        if let Some(ref existing_doc) = duplicate_check {
            println!("🔄 Attempting to reuse embeddings from existing document: {}", existing_doc.id);
            
            // Check if the existing document has embeddings
            let has_embeddings = {
                match vector_service.get_document_embedding_info(&existing_doc.id) {
                    Ok(embedding_info) => {
                        let chunks_count: i64 = embedding_info.get("total_chunks")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);
                        
                        if chunks_count > 0 {
                            println!("♻️ Found {} existing chunks, skipping embedding generation for duplicate", chunks_count);
                            true
                        } else {
                            println!("⚠️ Existing document has no embeddings, processing new ones");
                            false
                        }
                    }
                    Err(_) => {
                        println!("⚠️ Could not check existing embeddings, processing new ones");
                        false
                    }
                }
            };
            
            if !has_embeddings {
                process_document_embeddings_internal(vector_service, &document).await?;
            }
        } else {
            // No duplicate found, process normally
            process_document_embeddings_internal(vector_service, &document).await?;
        }
    } else {
        println!("DEBUG: Vector service not available, skipping embedding generation");
    }
    
    Ok(document)
}

// New command to serve PDF files to the frontend
#[tauri::command]
pub async fn get_pdf_file_path(filename: String) -> Result<String, String> {
    let storage_dir = get_pdf_storage_dir()?;
    let file_path = storage_dir.join(&filename);
    
    if !file_path.exists() {
        return Err(format!("PDF file not found: {}", filename));
    }
    
    file_path.to_str()
        .ok_or_else(|| "Invalid file path".to_string())
        .map(|s| s.to_string())
}

// New command to serve PDF file content as bytes for react-pdf
#[tauri::command]
pub async fn get_pdf_file_content(filename: String) -> Result<Vec<u8>, String> {
    let storage_dir = get_pdf_storage_dir()?;
    let file_path = storage_dir.join(&filename);
    
    if !file_path.exists() {
        return Err(format!("PDF file not found: {}", filename));
    }
    
    std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read PDF file: {}", e))
}

// New command to clean up PDF file when document is deleted
#[tauri::command]
pub async fn delete_pdf_file(filename: String) -> Result<bool, String> {
    let storage_dir = get_pdf_storage_dir()?;
    let file_path = storage_dir.join(&filename);
    
    if file_path.exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete PDF file: {}", e))?;
        println!("DEBUG: Deleted PDF file: {:?}", file_path);
        Ok(true)
    } else {
        println!("DEBUG: PDF file not found for deletion: {:?}", file_path);
        Ok(false)
    }
} 