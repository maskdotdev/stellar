use crate::database::{Database, Document, CreateDocumentRequest};
use crate::pdf_processor::{PdfProcessor, MarkerOptions};
use tauri::State;
use tokio::sync::Mutex;
use std::sync::Arc;

// Database state type
type DatabaseState = Arc<Mutex<Option<Database>>>;

#[tauri::command]
pub async fn upload_and_process_pdf(
    state: State<'_, DatabaseState>,
    file_path: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    use_marker: Option<bool>,
    use_enhanced: Option<bool>,
    use_markitdown: Option<bool>,
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf called with file_path: {}", file_path);
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained");
    
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
    
    // Create document request
    let request = CreateDocumentRequest {
        title: title.unwrap_or(metadata.title),
        content,
        file_path: Some(file_path),
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
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
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf_from_data called with file_name: {}", file_name);
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained, file size: {} bytes", file_data.len());
    
    // Create temporary directory for uploads
    let temp_dir = std::env::temp_dir().join("stellar_uploads");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let temp_file_path = temp_dir.join(&file_name);
    
    // Write the file data to temporary location
    std::fs::write(&temp_file_path, &file_data)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;
    
    println!("DEBUG: Saved PDF to: {:?}", temp_file_path);
    
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
    
    // Clean up temporary file
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
        file_path: Some(file_name), // Store the original filename
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
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
) -> Result<Document, String> {
    println!("DEBUG: upload_and_process_pdf_from_url called with URL: {}", url);
    
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    println!("DEBUG: Database state obtained");
    
    // Download PDF from URL to a temporary file
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
    
    // Create temporary directory for downloads
    let temp_dir = std::env::temp_dir().join("stellar_downloads");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let temp_file_path = temp_dir.join(filename);
    
    // Download and save the file
    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read PDF bytes: {}", e))?;
    
    std::fs::write(&temp_file_path, &bytes)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;
    
    println!("DEBUG: Downloaded PDF to: {:?}", temp_file_path);
    
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
    
    // Clean up temporary file
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
        file_path: Some(url), // Store the URL as the file path
        doc_type: "pdf".to_string(),
        tags: tags.unwrap_or_default(),
        status: Some("reading".to_string()),
    };
    
    println!("DEBUG: Created document request: {:?}", request.title);
    
    // Save to database
    let result = database.create_document(request).await
        .map_err(|e| format!("Failed to save document: {}", e));
    
    println!("DEBUG: Database operation result: {:?}", result.is_ok());
    
    result
} 