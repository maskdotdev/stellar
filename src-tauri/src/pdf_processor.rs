use pdf_extract::extract_text;
use std::path::{Path, PathBuf};
use reqwest;

use regex;
use tokio;

/// Represents the type of marker installation detected
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum MarkerInstallationType {
    /// Marker is installed in a virtual environment
    VirtualEnvironment,
    /// Marker is installed globally in the system PATH
    Global,
    /// No marker installation found
    NotFound,
    /// Virtual environment exists but marker_single is missing
    VenvExistsButMarkerMissing,
}

/// Detailed status information about marker installation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MarkerInstallationStatus {
    /// Whether marker is available for use
    pub is_available: bool,
    /// Type of installation detected
    pub installation_type: MarkerInstallationType,
    /// Path to the marker command if available
    pub command_path: Option<String>,
    /// Error message if marker is not available
    pub error_message: Option<String>,
    /// Suggested action for the user to resolve issues
    pub suggested_action: Option<String>,
}

impl MarkerInstallationStatus {
    /// Create a new status indicating marker is not found
    pub fn not_found() -> Self {
        Self {
            is_available: false,
            installation_type: MarkerInstallationType::NotFound,
            command_path: None,
            error_message: Some("Marker not found. Please install Marker to process PDFs.".to_string()),
            suggested_action: Some("Run the setup script: ./scripts/setup_marker.sh".to_string()),
        }
    }

    /// Create a new status for virtual environment installation
    pub fn virtual_environment(command_path: String) -> Self {
        Self {
            is_available: true,
            installation_type: MarkerInstallationType::VirtualEnvironment,
            command_path: Some(command_path),
            error_message: None,
            suggested_action: None,
        }
    }

    /// Create a new status for global installation
    pub fn global_installation() -> Self {
        Self {
            is_available: true,
            installation_type: MarkerInstallationType::Global,
            command_path: Some("marker_single".to_string()),
            error_message: None,
            suggested_action: None,
        }
    }

    /// Create a new status for when venv exists but marker is missing
    pub fn venv_exists_but_marker_missing() -> Self {
        Self {
            is_available: false,
            installation_type: MarkerInstallationType::VenvExistsButMarkerMissing,
            command_path: None,
            error_message: Some("Marker virtual environment found but marker_single is not installed.".to_string()),
            suggested_action: Some("Please run: ./scripts/setup_marker.sh".to_string()),
        }
    }
}

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

/// Resolves the marker_single command path by checking virtual environment and global installations
pub struct MarkerCommandResolver {
    venv_path: Option<PathBuf>,
    global_available: bool,
}

impl MarkerCommandResolver {
    /// Create a new MarkerCommandResolver and detect available installations
    pub async fn new() -> Self {
        let mut resolver = MarkerCommandResolver {
            venv_path: None,
            global_available: false,
        };
        
        resolver.detect_installations().await;
        resolver
    }

    /// Detect available marker installations in virtual environment and globally
    async fn detect_installations(&mut self) {
        // Check for virtual environment installation
        self.venv_path = self.detect_venv_path().await;
        
        // Check for global installation
        self.global_available = self.is_marker_available_globally().await;
    }

    /// Detect the virtual environment path containing marker_single
    /// Checks for marker_env directory in project root and other standard locations
    async fn detect_venv_path(&self) -> Option<PathBuf> {
        // Priority 1: Check for marker_env directory in current working directory (project root)
        let marker_env_path = PathBuf::from("marker_env");
        if self.detect_marker_env_directory(&marker_env_path).await {
            if self.is_marker_available_in_venv(&marker_env_path).await {
                // Convert to absolute path to avoid issues when changing working directory
                if let Ok(abs_path) = marker_env_path.canonicalize() {
                    return Some(abs_path);
                }
                return Some(marker_env_path);
            }
        }

        // Priority 2: Check for marker_env directory in parent directory (for when running from src-tauri)
        let parent_marker_env_path = PathBuf::from("../marker_env");
        if self.detect_marker_env_directory(&parent_marker_env_path).await {
            if self.is_marker_available_in_venv(&parent_marker_env_path).await {
                // Convert to absolute path to avoid issues when changing working directory
                if let Ok(abs_path) = parent_marker_env_path.canonicalize() {
                    return Some(abs_path);
                }
                return Some(parent_marker_env_path);
            }
        }

        // Priority 3: Check environment variable if set
        if let Ok(venv_path) = std::env::var("STELLAR_MARKER_VENV") {
            let venv_path = PathBuf::from(venv_path);
            if self.detect_marker_env_directory(&venv_path).await {
                if self.is_marker_available_in_venv(&venv_path).await {
                    // Environment variable should already be absolute, but ensure it
                    if let Ok(abs_path) = venv_path.canonicalize() {
                        return Some(abs_path);
                    }
                    return Some(venv_path);
                }
            }
        }

        // Priority 4: Check relative to current executable location
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let relative_marker_env = exe_dir.join("marker_env");
                if self.detect_marker_env_directory(&relative_marker_env).await {
                    if self.is_marker_available_in_venv(&relative_marker_env).await {
                        // This should already be absolute since current_exe is absolute
                        return Some(relative_marker_env);
                    }
                }
            }
        }

        None
    }

    /// Detect if marker_env directory exists and appears to be a valid virtual environment
    async fn detect_marker_env_directory(&self, venv_path: &PathBuf) -> bool {
        // Check if the directory exists
        if !venv_path.exists() || !venv_path.is_dir() {
            return false;
        }

        // Check for virtual environment structure
        // Unix-like systems should have bin/ directory
        let bin_dir = venv_path.join("bin");
        let scripts_dir = venv_path.join("Scripts"); // Windows

        // At least one of these should exist for a valid venv
        if !bin_dir.exists() && !scripts_dir.exists() {
            return false;
        }

        // Check for Python executable (additional validation)
        let python_paths = vec![
            bin_dir.join("python"),
            bin_dir.join("python3"),
            scripts_dir.join("python.exe"),
            scripts_dir.join("python3.exe"),
        ];

        for python_path in python_paths {
            if python_path.exists() {
                return true;
            }
        }

        // If no Python executable found, still consider it valid if directories exist
        // (some minimal venvs might not have all expected files)
        bin_dir.exists() || scripts_dir.exists()
    }

    /// Check if marker_single is available in the specified virtual environment
    async fn is_marker_available_in_venv(&self, venv_path: &PathBuf) -> bool {
        let marker_path = self.get_venv_marker_path(venv_path);
        
        if let Some(marker_path) = marker_path {
            // Check if the file exists and is executable
            if marker_path.exists() {
                // Try to execute it with --help to verify it works
                match tokio::process::Command::new(&marker_path)
                    .arg("--help")
                    .output()
                    .await
                {
                    Ok(output) => output.status.success(),
                    Err(_) => false,
                }
            } else {
                false
            }
        } else {
            false
        }
    }

    /// Check if marker_single is available globally in PATH
    /// This method provides fallback when virtual environment is not available
    async fn is_marker_available_globally(&self) -> bool {
        // First try to execute marker_single --help to verify it's available and working
        match tokio::process::Command::new("marker_single")
            .arg("--help")
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    // Additional validation: check if the output contains expected marker help text
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    // Look for marker-specific help text to ensure it's the right command
                    stdout.contains("marker") || stdout.contains("PDF") || stdout.contains("markdown")
                } else {
                    false
                }
            },
            Err(_) => {
                // Command not found in PATH, try alternative detection methods
                self.detect_global_marker_alternative().await
            }
        }
    }

    /// Alternative method to detect global marker installation
    /// Used as fallback when direct command execution fails
    async fn detect_global_marker_alternative(&self) -> bool {
        // Try to find marker_single in common installation paths
        let common_paths = vec![
            "/usr/local/bin/marker_single",
            "/usr/bin/marker_single",
            "/opt/homebrew/bin/marker_single", // macOS Homebrew
            "/home/linuxbrew/.linuxbrew/bin/marker_single", // Linux Homebrew
        ];

        for path in common_paths {
            let path_buf = PathBuf::from(path);
            if path_buf.exists() {
                // Try to execute it to verify it works
                match tokio::process::Command::new(&path_buf)
                    .arg("--help")
                    .output()
                    .await
                {
                    Ok(output) => {
                        if output.status.success() {
                            return true;
                        }
                    },
                    Err(_) => continue,
                }
            }
        }

        // Try using 'which' command to locate marker_single
        match tokio::process::Command::new("which")
            .arg("marker_single")
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path_str.is_empty() && PathBuf::from(&path_str).exists() {
                        // Verify the found executable works
                        return self.verify_marker_executable(&path_str).await;
                    }
                }
            },
            Err(_) => {}
        }

        // Try using 'whereis' command as another fallback (Linux/Unix)
        match tokio::process::Command::new("whereis")
            .arg("marker_single")
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    // whereis output format: "marker_single: /path/to/marker_single"
                    if let Some(path_part) = output_str.split_whitespace().nth(1) {
                        if PathBuf::from(path_part).exists() {
                            return self.verify_marker_executable(path_part).await;
                        }
                    }
                }
            },
            Err(_) => {}
        }

        false
    }

    /// Verify that a marker executable at the given path is working
    async fn verify_marker_executable(&self, path: &str) -> bool {
        match tokio::process::Command::new(path)
            .arg("--help")
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    // Verify it's actually marker by checking help output
                    stdout.contains("marker") || stdout.contains("PDF") || stdout.contains("markdown")
                } else {
                    false
                }
            },
            Err(_) => false,
        }
    }

    /// Get the path to marker_single executable in the virtual environment
    pub fn get_venv_marker_path(&self, venv_path: &PathBuf) -> Option<PathBuf> {
        // Check different possible locations for the executable
        let possible_paths = vec![
            venv_path.join("bin").join("marker_single"),           // Unix-like systems
            venv_path.join("Scripts").join("marker_single.exe"),   // Windows
            venv_path.join("Scripts").join("marker_single"),       // Windows without .exe
        ];

        for path in possible_paths {
            if path.exists() {
                return Some(path);
            }
        }

        None
    }

    /// Resolve the marker_single command path following priority order
    /// Priority: 1) Virtual environment, 2) Global installation
    /// Handles edge cases where multiple installations exist
    pub async fn resolve_marker_command(&self) -> Option<PathBuf> {
        // Priority 1: Virtual environment installation (preferred for consistency)
        if let Some(venv_path) = &self.venv_path {
            if let Some(marker_path) = self.get_venv_marker_path(venv_path) {
                // Verify the venv executable is actually working before returning it
                if self.verify_marker_executable_path(&marker_path).await {
                    return Some(marker_path);
                }
                // If venv executable exists but doesn't work, log and continue to global fallback
                eprintln!("Warning: Virtual environment marker_single found but not working: {:?}", marker_path);
            }
        }

        // Priority 2: Global installation (fallback)
        if self.global_available {
            // Double-check global availability before returning
            if self.verify_global_marker_executable().await {
                return Some(PathBuf::from("marker_single"));
            }
            // If global was detected but now fails, log the issue
            eprintln!("Warning: Global marker_single was detected but is no longer working");
        }

        // No working installation found
        None
    }

    /// Verify that a marker executable at the given path is working
    pub async fn verify_marker_executable_path(&self, path: &PathBuf) -> bool {
        if !path.exists() {
            return false;
        }

        match tokio::process::Command::new(path)
            .arg("--help")
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    // Verify it's actually marker by checking help output
                    stdout.contains("marker") || stdout.contains("PDF") || stdout.contains("markdown")
                } else {
                    false
                }
            },
            Err(_) => false,
        }
    }

    /// Verify that the global marker_single command is working
    pub async fn verify_global_marker_executable(&self) -> bool {
        match tokio::process::Command::new("marker_single")
            .arg("--help")
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    // Verify it's actually marker by checking help output
                    stdout.contains("marker") || stdout.contains("PDF") || stdout.contains("markdown")
                } else {
                    false
                }
            },
            Err(_) => false,
        }
    }

    /// Check if any marker installation is available
    pub fn is_marker_available(&self) -> bool {
        self.venv_path.is_some() || self.global_available
    }

    /// Get the virtual environment path if available
    pub fn get_venv_path(&self) -> Option<&PathBuf> {
        self.venv_path.as_ref()
    }

    /// Check if global marker installation is available
    pub fn is_global_available(&self) -> bool {
        self.global_available
    }


}

pub struct PdfProcessor {
    #[allow(dead_code)] // Reserved for future marker server API support
    marker_base_url: String,
    marker_timeout: u64, // seconds
}

impl PdfProcessor {
    pub fn new() -> Self {
        PdfProcessor {
            marker_base_url: "http://localhost:8001".to_string(),
            marker_timeout: 1200, // 20 minute timeout for complex PDFs
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

    /// Extract text using marker_single command directly
    pub async fn extract_with_marker(&self, file_path: &str, options: MarkerOptions) -> Result<String, PdfError> {
        // Check if file exists
        if !Path::new(file_path).exists() {
            return Err(PdfError::ExtractionError(format!("File not found: {}", file_path)));
        }

        // Use MarkerCommandResolver to get the appropriate command path
        let resolver = MarkerCommandResolver::new().await;
        let marker_command_path = resolver.resolve_marker_command().await
            .ok_or_else(|| {
                let status = self.get_marker_installation_status_sync(&resolver);
                let error_message = self.generate_installation_error_message(&status);
                PdfError::ExtractionError(error_message)
            })?;

        // Create temporary output directory
        let temp_dir = std::env::temp_dir().join("stellar_marker_output");
        if let Err(e) = std::fs::create_dir_all(&temp_dir) {
            return Err(PdfError::ExtractionError(format!("Failed to create temporary directory: {}", e)));
        }

        // Build marker_single command using resolved path
        let mut cmd = tokio::process::Command::new(&marker_command_path);
        cmd.arg(file_path)
            .arg("--output_format").arg("markdown")
            .arg("--output_dir").arg(&temp_dir);

        // Handle environment variable setup when using virtual environment
        if let Some(venv_path) = resolver.get_venv_path() {
            // Set up environment variables for virtual environment execution
            self.setup_venv_environment(&mut cmd, venv_path);
        }

        // Set up proper stdio handling to prevent hanging
        cmd.stdout(std::process::Stdio::piped()) 
           .stderr(std::process::Stdio::piped())
           .stdin(std::process::Stdio::null());

        // Set working directory to project root to ensure consistent behavior
        if let Ok(current_dir) = std::env::current_dir() {
            // If we're in src-tauri, go up one level to project root
            let working_dir = if current_dir.file_name().and_then(|s| s.to_str()) == Some("src-tauri") {
                current_dir.parent().unwrap_or(&current_dir)
            } else {
                &current_dir
            };
            cmd.current_dir(working_dir);
            println!("Setting working directory to: {:?}", working_dir);
        }

        // Add optional flags
        // Note: format_lines, use_llm, and gemini_api_key are disabled
        if options.force_ocr {
            cmd.arg("--force_ocr");
        }

        println!("Running marker_single command for file: {}", file_path);
        println!("Command path: {:?}", marker_command_path);
        println!("Output directory: {:?}", temp_dir);
        println!("Virtual environment path: {:?}", resolver.get_venv_path());
        
        // Debug: Print the full command that will be executed
        println!("Full command: {:?} {:?}", marker_command_path, cmd.as_std().get_args().collect::<Vec<_>>());

        // Execute command with timeout
        let timeout_duration = std::time::Duration::from_secs(self.marker_timeout);
        
        let output = match tokio::time::timeout(timeout_duration, cmd.output()).await {
            Ok(result) => match result {
                Ok(output) => output,
                Err(e) => return Err(PdfError::ExtractionError(format!("Failed to execute marker_single: {}", e))),
            },
            Err(_) => return Err(PdfError::ExtractionError(format!("Marker processing timed out ({} seconds). The PDF file may be too large or complex. Try processing it as a background job for longer files.", self.marker_timeout))),
        };

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);

            // Even if the command exited with a non-zero code, Marker may still have
            // produced a valid markdown file. Attempt to locate and return it.
            let file_stem = Path::new(file_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("output");

            let possible_output_files = vec![
                temp_dir.join(format!("{}.md", file_stem)),
                temp_dir.join(format!("{}_out.md", file_stem)),
                temp_dir.join(format!("{}_markdown.md", file_stem)),
            ];

            let possible_subdir_files = vec![
                temp_dir.join(&file_stem).join(format!("{}.md", file_stem)),
                temp_dir.join(&file_stem).join(format!("{}_out.md", file_stem)),
                temp_dir.join(&file_stem).join(format!("{}_markdown.md", file_stem)),
            ];

            let mut markdown_file: Option<std::path::PathBuf> = None;

            for possible_file in &possible_output_files {
                if possible_file.exists() {
                    markdown_file = Some(possible_file.clone());
                    break;
                }
            }

            if markdown_file.is_none() {
                for possible_file in &possible_subdir_files {
                    if possible_file.exists() {
                        markdown_file = Some(possible_file.clone());
                        break;
                    }
                }
            }

            if markdown_file.is_none() {
                if let Ok(entries) = std::fs::read_dir(&temp_dir) {
                    'outer: for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                                markdown_file = Some(path);
                                break;
                            }
                            if path.is_dir() {
                                if let Ok(subdir_entries) = std::fs::read_dir(&path) {
                                    for subdir_entry in subdir_entries {
                                        if let Ok(subdir_entry) = subdir_entry {
                                            let subdir_path = subdir_entry.path();
                                            if subdir_path.extension().and_then(|s| s.to_str()) == Some("md") {
                                                markdown_file = Some(subdir_path);
                                                break 'outer;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if let Some(markdown_path) = markdown_file {
                if let Ok(markdown_content) = std::fs::read_to_string(&markdown_path) {
                    if !markdown_content.trim().is_empty() {
                        // Best-effort cleanup of temp outputs
                        let _ = std::fs::remove_file(&markdown_path);
                        if temp_dir.exists() {
                            let _ = std::fs::remove_dir_all(&temp_dir);
                        }
                        println!("Marker returned non-zero exit but produced output; proceeding with extracted content (len={})", markdown_content.len());
                        return Ok(markdown_content);
                    }
                }
            }

            // No usable output; generate enhanced error message with installation context
            let helpful_error = self.generate_execution_error_message(&error, &stdout, &resolver);
            return Err(PdfError::ExtractionError(helpful_error));
        }

        // Find the output markdown file - marker_single creates files with different patterns
        let file_stem = Path::new(file_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");
        
        // Try different possible output file names that marker_single might create
        let possible_output_files = vec![
            temp_dir.join(format!("{}.md", file_stem)),
            temp_dir.join(format!("{}_out.md", file_stem)),
            temp_dir.join(format!("{}_markdown.md", file_stem)),
        ];
        
        // Also try files in subdirectories (marker often creates subdirectories)
        let possible_subdir_files = vec![
            temp_dir.join(&file_stem).join(format!("{}.md", file_stem)),
            temp_dir.join(&file_stem).join(format!("{}_out.md", file_stem)),
            temp_dir.join(&file_stem).join(format!("{}_markdown.md", file_stem)),
        ];
        
        // Also scan the directory for any .md files (in case marker uses a different naming convention)
        let mut markdown_file: Option<std::path::PathBuf> = None;
        
        // First try the expected names directly in temp_dir
        for possible_file in &possible_output_files {
            if possible_file.exists() {
                markdown_file = Some(possible_file.clone());
                break;
            }
        }
        
        // Then try files in subdirectories
        if markdown_file.is_none() {
            for possible_file in &possible_subdir_files {
                if possible_file.exists() {
                    markdown_file = Some(possible_file.clone());
                    break;
                }
            }
        }
        
        // If still not found, scan directory recursively for any .md files
        if markdown_file.is_none() {
            if let Ok(entries) = std::fs::read_dir(&temp_dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if path.extension().and_then(|s| s.to_str()) == Some("md") {
                            markdown_file = Some(path);
                            break;
                        }
                        
                        // If it's a directory, check inside it for .md files
                        if path.is_dir() {
                            if let Ok(subdir_entries) = std::fs::read_dir(&path) {
                                for subdir_entry in subdir_entries {
                                    if let Ok(subdir_entry) = subdir_entry {
                                        let subdir_path = subdir_entry.path();
                                        if subdir_path.extension().and_then(|s| s.to_str()) == Some("md") {
                                            markdown_file = Some(subdir_path);
                                            break;
                                        }
                                    }
                                }
                                if markdown_file.is_some() {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        let markdown_file = markdown_file.ok_or_else(|| {
            // List directory contents for debugging
            let mut debug_files = Vec::new();
            if let Ok(entries) = std::fs::read_dir(&temp_dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        debug_files.push(entry.path().display().to_string());
                    }
                }
            }
            
            // Combine all expected file paths for error message
            let mut all_expected_files = possible_output_files.iter().map(|p| p.display().to_string()).collect::<Vec<_>>();
            all_expected_files.extend(possible_subdir_files.iter().map(|p| p.display().to_string()));
            
            PdfError::ExtractionError(format!(
                "Marker output file not found. Expected one of: {:?}. Directory contents: {:?}. The PDF processing may have failed silently.",
                all_expected_files,
                debug_files
            ))
        })?;

        // Read the markdown content
        let markdown_content = match std::fs::read_to_string(&markdown_file) {
            Ok(content) => content,
            Err(e) => return Err(PdfError::ExtractionError(format!("Failed to read Marker output: {}", e))),
        };

        // Validate the content
        if markdown_content.trim().is_empty() {
            return Err(PdfError::ExtractionError(
                "Marker produced empty output. The PDF file may be corrupted or contain no extractable text.".to_string()
            ));
        }

        // Clean up temporary files and directories
        let _ = std::fs::remove_file(&markdown_file);
        
        // Clean up temp directory recursively (marker may create subdirectories)
        if temp_dir.exists() {
            let _ = std::fs::remove_dir_all(&temp_dir);
        }

        println!("Successfully processed PDF with Marker, output length: {}", markdown_content.len());
        Ok(markdown_content)
    }

    /// Get detailed marker installation status synchronously using an existing resolver
    /// This is a helper method for use within other methods that already have a resolver
    fn get_marker_installation_status_sync(&self, resolver: &MarkerCommandResolver) -> MarkerInstallationStatus {
        // Check if virtual environment exists
        let _venv_exists = resolver.get_venv_path().is_some();
        let global_available = resolver.is_global_available();
        
        // Determine installation status based on what's available
        if let Some(venv_path) = resolver.get_venv_path() {
            // Virtual environment exists, check if marker is available in it
            if let Some(marker_path) = resolver.get_venv_marker_path(venv_path) {
                // For sync version, we assume the resolver has already validated the path
                return MarkerInstallationStatus::virtual_environment(
                    marker_path.to_string_lossy().to_string()
                );
            } else {
                // Virtual environment exists but marker_single is not installed
                return MarkerInstallationStatus::venv_exists_but_marker_missing();
            }
        } else if global_available {
            // No virtual environment but global installation is available
            return MarkerInstallationStatus::global_installation();
        } else {
            // No installation found at all
            return MarkerInstallationStatus::not_found();
        }
    }

    /// Generate specific error message based on marker installation status
    /// Provides targeted guidance based on MarkerInstallationType
    /// Includes references to setup script when appropriate
    fn generate_installation_error_message(&self, status: &MarkerInstallationStatus) -> String {
        match status.installation_type {
            MarkerInstallationType::NotFound => {
                "Marker not found. Please install Marker to process PDFs.\n\nTo install Marker, run the setup script:\n  ./scripts/setup_marker.sh\n\nThis will create a virtual environment and install all required dependencies.".to_string()
            },
            MarkerInstallationType::VenvExistsButMarkerMissing => {
                "Marker virtual environment found but marker_single is not installed.\n\nThe virtual environment exists but appears to be incomplete. Please run the setup script to complete the installation:\n  ./scripts/setup_marker.sh\n\nThis will install marker_single and its dependencies in the existing virtual environment.".to_string()
            },
            MarkerInstallationType::Global => {
                // This case shouldn't happen since we only call this when marker is not available
                // But we'll handle it gracefully
                "Marker appears to be installed globally but is not working properly.\n\nPlease try running the setup script to create a clean virtual environment installation:\n  ./scripts/setup_marker.sh".to_string()
            },
            MarkerInstallationType::VirtualEnvironment => {
                // This case shouldn't happen since we only call this when marker is not available
                // But we'll handle it gracefully
                "Marker appears to be installed in virtual environment but is not working properly.\n\nPlease try running the setup script to reinstall:\n  ./scripts/setup_marker.sh".to_string()
            }
        }
    }

    /// Generate enhanced error message for marker execution failures
    /// Provides specific instructions based on MarkerInstallationType and error details
    /// Includes references to setup script when appropriate
    fn generate_execution_error_message(&self, stderr: &str, stdout: &str, resolver: &MarkerCommandResolver) -> String {
        // Get installation status for context
        let status = self.get_marker_installation_status_sync(resolver);
        
        // Check for specific error patterns first
        if stderr.contains("No such file or directory") || stderr.contains("command not found") {
            return match status.installation_type {
                MarkerInstallationType::VirtualEnvironment => {
                    "Marker command not found despite virtual environment installation.\n\nThe virtual environment may be corrupted. Please run the setup script to reinstall:\n  ./scripts/setup_marker.sh".to_string()
                },
                MarkerInstallationType::Global => {
                    "Marker command not found despite global installation.\n\nThe global installation may be corrupted. Please run the setup script to create a clean virtual environment installation:\n  ./scripts/setup_marker.sh".to_string()
                },
                _ => {
                    "Marker command not found. Please install Marker by running the setup script:\n  ./scripts/setup_marker.sh".to_string()
                }
            };
        }
        
        if stderr.contains("Permission denied") {
            return match status.installation_type {
                MarkerInstallationType::VirtualEnvironment => {
                    "Permission denied when executing marker_single from virtual environment.\n\nThis may be a file permissions issue. Try running the setup script to fix permissions:\n  ./scripts/setup_marker.sh".to_string()
                },
                _ => {
                    "Permission denied when executing marker_single.\n\nPlease check file permissions or run the setup script:\n  ./scripts/setup_marker.sh".to_string()
                }
            };
        }
        
        if stderr.contains("API key") {
            return "Invalid or missing API key for LLM features.\n\nPlease check your Gemini API key in settings, or disable LLM features in PDF processing options.".to_string();
        }
        
        if stderr.contains("rate limit") {
            return "API rate limit exceeded.\n\nPlease try again in a few minutes, or disable LLM features to avoid API calls.".to_string();
        }
        
        if stderr.contains("ModuleNotFoundError") || stderr.contains("ImportError") {
            return match status.installation_type {
                MarkerInstallationType::VirtualEnvironment => {
                    "Python module missing from virtual environment.\n\nThe virtual environment may be incomplete. Please run the setup script to reinstall all dependencies:\n  ./scripts/setup_marker.sh".to_string()
                },
                MarkerInstallationType::Global => {
                    "Python module missing from global installation.\n\nPlease run the setup script to create a complete virtual environment installation:\n  ./scripts/setup_marker.sh".to_string()
                },
                _ => {
                    "Python module missing. Please install Marker by running the setup script:\n  ./scripts/setup_marker.sh".to_string()
                }
            };
        }
        
        if stderr.contains("CUDA") || stderr.contains("GPU") {
            return "GPU/CUDA related error during PDF processing.\n\nThis may be due to GPU driver issues, insufficient GPU memory, or CUDA not being available on this system (like Apple Silicon Macs). The processing should automatically fall back to CPU mode.".to_string();
        }
        
        if stderr.contains("out of memory") || stderr.contains("OOM") {
            return "Out of memory during PDF processing.\n\nThe PDF file may be too large. Try processing a smaller file, or consider using a machine with more RAM.".to_string();
        }
        
        // Generic error handling with installation context
        let base_error = if !stderr.is_empty() {
            format!("Marker processing failed: {}", stderr)
        } else if !stdout.is_empty() {
            format!("Marker processing failed: {}", stdout)
        } else {
            "Marker processing failed with unknown error".to_string()
        };
        
        // Add installation-specific guidance
        let guidance = match status.installation_type {
            MarkerInstallationType::VirtualEnvironment => {
                "\n\nIf the problem persists, try reinstalling the virtual environment:\n  ./scripts/setup_marker.sh"
            },
            MarkerInstallationType::Global => {
                "\n\nConsider using the virtual environment installation for better isolation:\n  ./scripts/setup_marker.sh"
            },
            MarkerInstallationType::VenvExistsButMarkerMissing => {
                "\n\nPlease complete the installation by running:\n  ./scripts/setup_marker.sh"
            },
            MarkerInstallationType::NotFound => {
                "\n\nPlease install Marker by running:\n  ./scripts/setup_marker.sh"
            }
        };
        
        format!("{}{}", base_error, guidance)
    }

    /// Set up environment variables for virtual environment execution
    /// This ensures the marker command runs with the correct Python environment
    fn setup_venv_environment(&self, cmd: &mut tokio::process::Command, venv_path: &PathBuf) {
        // Set VIRTUAL_ENV environment variable
        cmd.env("VIRTUAL_ENV", venv_path);
        
        // Update PATH to include the virtual environment's bin directory
        let bin_dir = if cfg!(windows) {
            venv_path.join("Scripts")
        } else {
            venv_path.join("bin")
        };
        
        // Get current PATH and prepend the venv bin directory
        if let Ok(current_path) = std::env::var("PATH") {
            let new_path = format!("{}:{}", bin_dir.display(), current_path);
            cmd.env("PATH", new_path);
        } else {
            // If PATH is not set, just use the venv bin directory
            cmd.env("PATH", bin_dir);
        }
        
        // Set PYTHONPATH to ensure proper module resolution
        cmd.env("PYTHONPATH", venv_path.join("lib"));
        
        // Unset PYTHONHOME to avoid conflicts
        cmd.env_remove("PYTHONHOME");

        // Reduce excessive threading which can cause semaphore leaks and high memory on large PDFs
        cmd.env("OMP_NUM_THREADS", "1");
        cmd.env("MKL_NUM_THREADS", "1");
        cmd.env("TOKENIZERS_PARALLELISM", "false");
        cmd.env("PYTHONUNBUFFERED", "1");
        // Prefer CPU fallback on Apple Silicon if GPU/MPS initialization fails
        cmd.env("PYTORCH_ENABLE_MPS_FALLBACK", "1");
    }

    /// Get detailed marker installation status with appropriate messages and suggested actions
    /// Returns comprehensive information about marker availability and installation type
    /// Provides specific guidance based on detected installation state
    pub async fn get_marker_installation_status(&self) -> MarkerInstallationStatus {
        let resolver = MarkerCommandResolver::new().await;
        
        // Check if virtual environment exists
        let _venv_exists = resolver.get_venv_path().is_some();
        let global_available = resolver.is_global_available();
        
        // Determine installation status based on what's available
        if let Some(venv_path) = resolver.get_venv_path() {
            // Virtual environment exists, check if marker is available in it
            if let Some(marker_path) = resolver.get_venv_marker_path(venv_path) {
                // Verify the marker executable actually works
                if resolver.verify_marker_executable_path(&marker_path).await {
                    return MarkerInstallationStatus::virtual_environment(
                        marker_path.to_string_lossy().to_string()
                    );
                } else {
                    // Virtual environment exists but marker is broken
                    return MarkerInstallationStatus {
                        is_available: false,
                        installation_type: MarkerInstallationType::VenvExistsButMarkerMissing,
                        command_path: None,
                        error_message: Some("Marker virtual environment found but marker_single command is not working properly.".to_string()),
                        suggested_action: Some("Please run the setup script to reinstall: ./scripts/setup_marker.sh".to_string()),
                    };
                }
            } else {
                // Virtual environment exists but marker_single is not installed
                return MarkerInstallationStatus::venv_exists_but_marker_missing();
            }
        } else if global_available {
            // No virtual environment but global installation is available
            // Double-check that global installation actually works
            if resolver.verify_global_marker_executable().await {
                return MarkerInstallationStatus::global_installation();
            } else {
                // Global installation was detected but doesn't work
                return MarkerInstallationStatus {
                    is_available: false,
                    installation_type: MarkerInstallationType::NotFound,
                    command_path: None,
                    error_message: Some("Marker was detected globally but is not working properly.".to_string()),
                    suggested_action: Some("Please reinstall Marker or run the setup script: ./scripts/setup_marker.sh".to_string()),
                };
            }
        } else {
            // No installation found at all
            return MarkerInstallationStatus::not_found();
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MarkerOptions {
    pub extract_images: bool,
    pub force_ocr: bool,
    pub prefer_marker: bool,
    // Disabled options: use_llm, format_lines, gemini_api_key
}

impl Default for MarkerOptions {
    fn default() -> Self {
        MarkerOptions {
            extract_images: false,
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
    pub force_ocr: bool,
    pub timeout_seconds: u64,
    // Disabled options: use_llm, format_lines
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
            force_ocr: false,
            timeout_seconds: 120,
        }
    }
}

#[cfg(test)]
mod tests;
