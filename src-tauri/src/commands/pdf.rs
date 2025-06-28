use crate::database::{Database, Document, CreateDocumentRequest};
use crate::pdf_processor::{PdfProcessor, MarkerOptions};
use tauri::State;
use tokio::sync::Mutex;
use std::sync::Arc;
use std::path::PathBuf;
use uuid::Uuid;

// Database state type
type DatabaseState = Arc<Mutex<Option<Database>>>;

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
    state: State<'_, DatabaseState>,
    file_path: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
    use_enhanced: Option<bool>,
    use_markitdown: Option<bool>,
    category_id: Option<String>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf called with file_path: {}", file_path);
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
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
    
    // Create document request with stored filename
    let request = CreateDocumentRequest {
        title: title.unwrap_or(metadata.title),
        content,
        file_path: Some(stored_filename), // Store the unique filename
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
        category_id,
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let result = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e));
    
    println!("DEBUG: Database operation result: {:?}", result.is_ok());
    
    result
}

#[tauri::command]
pub async fn upload_and_process_pdf_from_data(
    state: State<'_, DatabaseState>,
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
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
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
    
    // Clean up temporary processing file
    let _ = std::fs::remove_file(&temp_file_path);
    
    // Create document request
    let doc_title = title.unwrap_or_else(|| {
        file_name.split('.').next()
            .map(|name| name.replace(['_', '-'], " "))
            .unwrap_or(metadata.title.clone())
    });
    
    let request = CreateDocumentRequest {
        title: doc_title,
        content,
        file_path: Some(stored_filename), // Store the unique filename
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
        category_id,
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let result = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e));
    
    println!("DEBUG: Database operation result: {:?}", result.is_ok());
    
    result
}

#[tauri::command]
pub async fn upload_and_process_pdf_from_url(
    state: State<'_, DatabaseState>,
    url: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
    use_enhanced: Option<bool>,
    use_markitdown: Option<bool>,
    category_id: Option<String>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf_from_url called with URL: {}", url);
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
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
    
    // Clean up temporary processing file
    let _ = std::fs::remove_file(&temp_file_path);
    
    // Create document request
    let doc_title = title.unwrap_or_else(|| {
        // Try to extract title from URL or use metadata title
        url.split('/')
            .last()
            .and_then(|name| name.split('.').next())
            .map(|name| name.replace(['_', '-'], " "))
            .unwrap_or(metadata.title)
    });
    
    let request = CreateDocumentRequest {
        title: doc_title,
        content,
        file_path: Some(stored_filename), // Store the unique filename
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
        category_id,
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let result = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e));
    
    println!("DEBUG: Database operation result: {:?}", result.is_ok());
    
    result
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