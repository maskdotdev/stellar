use pdf_extract::extract_text;
use std::path::Path;
use reqwest;
use serde_json;
use std::fs;
use regex;
use tokio;

#[derive(Debug)]
#[allow(dead_code)]
pub enum PdfError {
    IoError(std::io::Error),
    ExtractionError(String),
    NetworkError(String),
}

impl From<std::io::Error> for PdfError {
    fn from(error: std::io::Error) -> Self {
        PdfError::IoError(error)
    }
}

impl From<reqwest::Error> for PdfError {
    fn from(error: reqwest::Error) -> Self {
        PdfError::NetworkError(format!("HTTP request failed: {}", error))
    }
}

pub struct PdfProcessor {
    marker_base_url: String,
    marker_timeout: u64, // seconds
}

impl PdfProcessor {
    pub fn new() -> Self {
        PdfProcessor {
            marker_base_url: "http://localhost:8001".to_string(),
            marker_timeout: 60, // 1 minute timeout
        }
    }

    pub fn with_config(marker_url: String, timeout: u64) -> Self {
        PdfProcessor {
            marker_base_url: marker_url,
            marker_timeout: timeout,
        }
    }

    /// Extract text from a PDF file and convert it to markdown
    pub fn extract_text_from_pdf(&self, file_path: &str) -> Result<String, PdfError> {
        // Check if file exists
        if !Path::new(file_path).exists() {
            return Err(PdfError::ExtractionError(format!("File not found: {}", file_path)));
        }

        // Extract text from PDF
        let text = extract_text(file_path)
            .map_err(|e| PdfError::ExtractionError(format!("Failed to extract text: {}", e)))?;

        // Enhanced text cleanup and markdown conversion
        let markdown = self.text_to_markdown_enhanced(&text);

        Ok(markdown)
    }

    /// Enhanced text to markdown conversion with better structure detection
    fn text_to_markdown_enhanced(&self, text: &str) -> String {
        let mut markdown = String::new();
        let lines: Vec<&str> = text.split('\n').collect();
        let mut in_paragraph = false;
        let mut in_list = false;
        let mut _current_list_indent = 0;

        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();
            
            // Skip empty lines
            if trimmed.is_empty() {
                if in_paragraph {
                    markdown.push_str("\n\n");
                    in_paragraph = false;
                }
                if in_list {
                    markdown.push('\n');
                    in_list = false;
                }
                continue;
            }

            // Detect lists
            if let Some(list_item) = self.detect_list_item(trimmed) {
                if !in_list {
                    if in_paragraph {
                        markdown.push_str("\n\n");
                        in_paragraph = false;
                    }
                    in_list = true;
                }
                markdown.push_str(&list_item);
                markdown.push('\n');
                continue;
            }

            // Detect headings with better heuristics
            if let Some(heading) = self.detect_heading(trimmed, i, &lines) {
                if in_paragraph {
                    markdown.push_str("\n\n");
                    in_paragraph = false;
                }
                if in_list {
                    markdown.push('\n');
                    in_list = false;
                }
                markdown.push_str(&heading);
                markdown.push_str("\n\n");
                continue;
            }

            // Detect code blocks
            if self.looks_like_code(trimmed) {
                if in_paragraph {
                    markdown.push_str("\n\n");
                    in_paragraph = false;
                }
                markdown.push_str("```\n");
                markdown.push_str(trimmed);
                markdown.push_str("\n```\n\n");
                continue;
            }

            // Regular paragraph text
            if in_list {
                markdown.push('\n');
                in_list = false;
            }
            
            if !in_paragraph {
                in_paragraph = true;
            } else {
                markdown.push(' ');
            }
            markdown.push_str(trimmed);
        }

        // Final cleanup
        self.cleanup_markdown(&markdown)
    }

    /// Detect list items with better patterns
    fn detect_list_item(&self, line: &str) -> Option<String> {
        // Bullet points
        if line.starts_with("• ") || line.starts_with("- ") || line.starts_with("* ") {
            return Some(format!("- {}", &line[2..]));
        }
        
        // Numbered lists
        if let Some(caps) = regex::Regex::new(r"^(\d+)\.?\s+(.+)$").unwrap().captures(line) {
            if let (Some(num), Some(content)) = (caps.get(1), caps.get(2)) {
                return Some(format!("{}. {}", num.as_str(), content.as_str()));
            }
        }
        
        None
    }

    /// Enhanced heading detection with context
    fn detect_heading(&self, line: &str, index: usize, lines: &[&str]) -> Option<String> {
        // Check if it looks like a heading
        if !self.looks_like_heading(line) {
            return None;
        }

        // Determine heading level based on context and formatting
        let level = self.determine_heading_level(line, index, lines);
        
        Some(format!("{} {}", "#".repeat(level), line))
    }

    /// Determine heading level based on various factors
    fn determine_heading_level(&self, line: &str, index: usize, lines: &[&str]) -> usize {
        // Check for all caps (likely higher level heading)
        if line.chars().all(|c| c.is_uppercase() || !c.is_alphabetic()) {
            return 1;
        }

        // Check for title case
        if self.is_title_case(line) {
            return 2;
        }

        // Check for context clues
        if index > 0 && index < lines.len() - 1 {
            let prev_line = lines[index - 1].trim();
            let next_line = lines[index + 1].trim();
            
            // If surrounded by empty lines, likely a heading
            if prev_line.is_empty() && next_line.is_empty() {
                return 2;
            }
        }

        // Default to level 3
        3
    }

    /// Check if text is in title case
    fn is_title_case(&self, text: &str) -> bool {
        let words: Vec<&str> = text.split_whitespace().collect();
        if words.is_empty() {
            return false;
        }

        let title_case_words = words.iter()
            .filter(|word| {
                if word.len() == 0 {
                    return false;
                }
                let first_char = word.chars().next().unwrap();
                first_char.is_uppercase()
            })
            .count();

        // At least 75% of words should start with uppercase
        title_case_words as f64 / words.len() as f64 >= 0.75
    }

    /// Detect if a line looks like code
    fn looks_like_code(&self, line: &str) -> bool {
        // Common code patterns
        line.contains("function ") ||
        line.contains("class ") ||
        line.contains("def ") ||
        line.contains("import ") ||
        line.contains("from ") ||
        line.contains("SELECT ") ||
        line.contains("INSERT ") ||
        line.contains("UPDATE ") ||
        line.starts_with("    ") && (line.contains("(") || line.contains("{") || line.contains(";"))
    }

    /// Enhanced heading detection heuristics
    fn looks_like_heading(&self, line: &str) -> bool {
        // Skip if too long
        if line.len() > 100 {
            return false;
        }

        // Skip if ends with sentence punctuation
        if line.ends_with('.') || line.ends_with(',') || line.ends_with(';') || line.ends_with('!') || line.ends_with('?') {
            return false;
        }

        // Must have some uppercase letters
        if !line.chars().any(|c| c.is_uppercase()) {
            return false;
        }

        // Should be relatively short
        let word_count = line.split_whitespace().count();
        if word_count > 12 {
            return false;
        }

        // Check for common heading patterns
        line.chars().any(|c| c.is_uppercase()) && word_count <= 8
    }

    /// Enhanced markdown cleanup
    fn cleanup_markdown(&self, text: &str) -> String {
        let mut result = text
            .replace("\n\n\n", "\n\n") // Remove triple line breaks
            .replace("  ", " ") // Remove double spaces
            .trim()
            .to_string();

        // Fix heading spacing
        result = regex::Regex::new(r"\n(#+\s)")
            .unwrap()
            .replace_all(&result, "\n\n$1")
            .to_string();

        // Fix list spacing
        result = regex::Regex::new(r"\n(-\s|\d+\.\s)")
            .unwrap()
            .replace_all(&result, "\n\n$1")
            .to_string();

        result
    }

    /// Extract metadata from PDF (title, etc.)
    pub fn extract_metadata(&self, file_path: &str) -> Result<PdfMetadata, PdfError> {
        // For now, just return basic metadata
        // In a more advanced implementation, you could use lopdf to extract actual PDF metadata
        let path = Path::new(file_path);
        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();

        Ok(PdfMetadata {
            title,
            author: None,
            subject: None,
            creator: None,
        })
    }

    /// Extract text using Marker API with improved error handling and options
    pub async fn extract_with_marker(&self, file_path: &str, options: MarkerOptions) -> Result<String, PdfError> {
        // Check if file exists
        if !Path::new(file_path).exists() {
            return Err(PdfError::ExtractionError(format!("File not found: {}", file_path)));
        }

        // Check if Marker server is available
        if !self.is_marker_available().await {
            return Err(PdfError::NetworkError("Marker server is not available".to_string()));
        }

        // Prepare multipart form data for file upload
        let client = reqwest::Client::new();
        let file_contents = fs::read(file_path)
            .map_err(|e| PdfError::IoError(e))?;

        let filename = Path::new(file_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();

        let form = reqwest::multipart::Form::new()
            .part("file", reqwest::multipart::Part::bytes(file_contents)
                .file_name(filename)
                .mime_str("application/pdf").unwrap())
            .text("extract_images", options.extract_images.to_string())
            .text("use_llm", options.use_llm.to_string())
            .text("format_lines", options.format_lines.to_string())
            .text("force_ocr", options.force_ocr.to_string())
            .text("output_format", "markdown");

        let response = client
            .post(&format!("{}/marker", self.marker_base_url))
            .multipart(form)
            .timeout(std::time::Duration::from_secs(self.marker_timeout))
            .send()
            .await?;

        let status_code = response.status();
        if !status_code.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(PdfError::NetworkError(format!(
                "Marker API returned status {}: {}", 
                status_code,
                error_text
            )));
        }

        let result: serde_json::Value = response.json().await?;

        // Handle different response formats
        if let Some(markdown) = result.get("markdown").and_then(|v| v.as_str()) {
            Ok(markdown.to_string())
        } else if let Some(text) = result.get("text").and_then(|v| v.as_str()) {
            Ok(text.to_string())
        } else if let Some(content) = result.get("content").and_then(|v| v.as_str()) {
            Ok(content.to_string())
        } else {
            Err(PdfError::ExtractionError(
                "Unexpected response format from Marker API".to_string()
            ))
        }
    }

    /// Check if Marker server is available
    async fn is_marker_available(&self) -> bool {
        let client = reqwest::Client::new();
        match client
            .get(&format!("{}/health", self.marker_base_url))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }

    /// Smart extraction with multiple fallback options
    pub async fn extract_text_smart(&self, file_path: &str, options: MarkerOptions) -> Result<String, PdfError> {
        // Try Marker first if enabled
        if options.prefer_marker {
            match self.extract_with_marker(file_path, options.clone()).await {
                Ok(markdown) => return Ok(markdown),
                Err(e) => {
                    println!("Marker extraction failed: {:?}, falling back to enhanced basic extraction", e);
                }
            }
        }

        // Fallback to enhanced basic extraction
        self.extract_text_from_pdf(file_path)
    }

    /// Extract using MarkItDown (Microsoft's tool) via Python
    pub async fn extract_with_markitdown(&self, file_path: &str) -> Result<String, PdfError> {
        // Check if file exists
        if !Path::new(file_path).exists() {
            return Err(PdfError::ExtractionError(format!("File not found: {}", file_path)));
        }

        // Get the current working directory and check multiple possible locations
        let current_dir = std::env::current_dir()
            .map_err(|e| PdfError::ExtractionError(format!("Failed to get current directory: {}", e)))?;
        
        // Try multiple possible paths for the markitdown virtual environment
        let possible_paths = vec![
            Some(current_dir.join("markitdown_env").join("bin").join("python")),
            current_dir.parent().map(|p| p.join("markitdown_env").join("bin").join("python")),
            current_dir.parent().and_then(|p| p.parent()).map(|p| p.join("markitdown_env").join("bin").join("python")),
        ];
        
        let mut venv_python = None;
        for path_opt in possible_paths {
            if let Some(path) = path_opt {
                if path.exists() {
                    venv_python = Some(path);
                    break;
                }
            }
        }
        
                let venv_python = venv_python.ok_or_else(|| {
            let attempted_paths: Vec<String> = vec![
                current_dir.join("markitdown_env").join("bin").join("python").display().to_string(),
                current_dir.parent().map(|p| p.join("markitdown_env").join("bin").join("python").display().to_string()).unwrap_or_else(|| "N/A".to_string()),
                current_dir.parent().and_then(|p| p.parent()).map(|p| p.join("markitdown_env").join("bin").join("python").display().to_string()).unwrap_or_else(|| "N/A".to_string()),
            ];
            PdfError::ExtractionError(format!(
                "MarkItDown virtual environment not found. Current dir: {}. Tried paths: {}. Run: ./scripts/setup_markitdown.sh", 
                current_dir.display(),
                attempted_paths.join(", ")
            ))
         })?;

        // Check if markitdown is available in the virtual environment
        let output = tokio::process::Command::new(&venv_python)
            .arg("-c")
            .arg("import markitdown")
            .output()
            .await;

        if output.is_err() || !output.unwrap().status.success() {
            return Err(PdfError::ExtractionError(
                "MarkItDown not available in virtual environment. Run: ./scripts/setup_markitdown.sh".to_string()
            ));
        }

        // Use markitdown via the virtual environment's Python
        let output = tokio::process::Command::new(&venv_python)
            .arg("-m")
            .arg("markitdown")
            .arg(file_path)
            .output()
            .await
            .map_err(|e| PdfError::ExtractionError(format!("Failed to run markitdown: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(PdfError::ExtractionError(format!("MarkItDown failed: {}", error)));
        }

        let markdown = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(markdown)
    }

    /// Basic text extraction without enhanced processing (for fallback)
    pub fn extract_basic_text(&self, file_path: &str) -> Result<String, PdfError> {
        let text = extract_text(file_path)
            .map_err(|e| PdfError::ExtractionError(format!("Failed to extract text: {}", e)))?;
        
        // Minimal markdown conversion
        Ok(text.replace("\n\n", "\n\n"))
    }
}

#[derive(Debug, Clone)]
pub struct MarkerOptions {
    pub extract_images: bool,
    pub use_llm: bool,
    pub format_lines: bool,
    pub force_ocr: bool,
    pub prefer_marker: bool,
}

impl Default for MarkerOptions {
    fn default() -> Self {
        MarkerOptions {
            extract_images: false,
            use_llm: false,
            format_lines: true,
            force_ocr: false,
            prefer_marker: true,
        }
    }
}

#[derive(Debug)]
#[allow(dead_code)]
pub struct PdfMetadata {
    pub title: String,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub creator: Option<String>,
}

#[derive(Debug, Clone)]
pub enum ExtractionMethod {
    Marker,      // High quality, slow
    MarkItDown,  // Microsoft's tool, balanced
    Enhanced,    // Our enhanced basic processing
    Basic,       // Simple text extraction
}

#[derive(Debug, Clone)]
pub struct ExtractOptions {
    pub preferred_methods: Vec<ExtractionMethod>,
    pub extract_images: bool,
    pub use_llm: bool,
    pub format_lines: bool,
    pub force_ocr: bool,
    pub timeout_seconds: u64,
}

impl Default for ExtractOptions {
    fn default() -> Self {
        ExtractOptions {
            preferred_methods: vec![
                ExtractionMethod::Marker,
                ExtractionMethod::MarkItDown,
                ExtractionMethod::Enhanced,
                ExtractionMethod::Basic,
            ],
            extract_images: false,
            use_llm: false,
            format_lines: true,
            force_ocr: false,
            timeout_seconds: 120,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_looks_like_heading() {
        let processor = PdfProcessor::new();
        
        assert!(processor.looks_like_heading("Introduction"));
        assert!(processor.looks_like_heading("Chapter 1: Overview"));
        assert!(!processor.looks_like_heading("This is a long sentence that continues for a while and doesn't look like a heading at all."));
        assert!(!processor.looks_like_heading("This sentence ends with a period."));
    }

    #[test]
    fn test_text_to_markdown() {
        let processor = PdfProcessor::new();
        let input = "Introduction\n\nThis is the first paragraph of text that should be converted to markdown.\n\nAnother Section\n\nThis is another paragraph with some content.";
        
        let result = processor.text_to_markdown_enhanced(input);
        assert!(result.contains("## Introduction"));
        assert!(result.contains("## Another Section"));
    }
} 