use pdf_extract::extract_text;
use std::path::Path;

#[derive(Debug)]
#[allow(dead_code)]
pub enum PdfError {
    IoError(std::io::Error),
    ExtractionError(String),
}

impl From<std::io::Error> for PdfError {
    fn from(error: std::io::Error) -> Self {
        PdfError::IoError(error)
    }
}

pub struct PdfProcessor;

impl PdfProcessor {
    pub fn new() -> Self {
        PdfProcessor
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

        // Basic text cleanup and markdown conversion
        let markdown = self.text_to_markdown(&text);

        Ok(markdown)
    }

    /// Convert plain text to basic markdown format
    fn text_to_markdown(&self, text: &str) -> String {
        let mut markdown = String::new();
        let lines: Vec<&str> = text.split('\n').collect();
        let mut in_paragraph = false;

        for line in lines {
            let trimmed = line.trim();
            
            // Skip empty lines
            if trimmed.is_empty() {
                if in_paragraph {
                    markdown.push_str("\n\n");
                    in_paragraph = false;
                }
                continue;
            }

            // Detect potential headings (lines that are shorter and potentially titles)
            if self.looks_like_heading(trimmed) {
                if in_paragraph {
                    markdown.push_str("\n\n");
                }
                markdown.push_str(&format!("## {}\n\n", trimmed));
                in_paragraph = false;
            } else {
                // Regular paragraph text
                if !in_paragraph {
                    in_paragraph = true;
                } else {
                    markdown.push(' ');
                }
                markdown.push_str(trimmed);
            }
        }

        // Final cleanup
        self.cleanup_markdown(&markdown)
    }

    /// Simple heuristic to detect potential headings
    fn looks_like_heading(&self, line: &str) -> bool {
        // Check if line is relatively short and doesn't end with punctuation
        line.len() < 100 
            && !line.ends_with('.') 
            && !line.ends_with(',')
            && !line.ends_with(';')
            && line.chars().any(|c| c.is_uppercase())
            && line.split_whitespace().count() <= 8
    }

    /// Clean up the markdown text
    fn cleanup_markdown(&self, text: &str) -> String {
        // Remove excessive whitespace and normalize line breaks
        let mut result = text
            .replace("\n\n\n", "\n\n") // Remove triple line breaks
            .replace("  ", " ") // Remove double spaces
            .trim()
            .to_string();

        // Ensure proper spacing after headers
        result = result.replace("##", "\n## ").trim_start().to_string();
        
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
}

#[derive(Debug)]
#[allow(dead_code)]
pub struct PdfMetadata {
    pub title: String,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub creator: Option<String>,
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
        
        let result = processor.text_to_markdown(input);
        assert!(result.contains("## Introduction"));
        assert!(result.contains("## Another Section"));
    }
} 