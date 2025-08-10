#[cfg(test)]
mod integration_tests {
    use super::super::*;
    use std::path::PathBuf;
    use tokio;

    #[tokio::test]
    async fn test_marker_command_resolver_detects_venv() {
        let resolver = MarkerCommandResolver::new().await;
        
        // Should detect the virtual environment
        assert!(resolver.get_venv_path().is_some(), "Virtual environment should be detected");
        
        // Should be able to resolve marker command
        let command_path = resolver.resolve_marker_command().await;
        assert!(command_path.is_some(), "Should be able to resolve marker command");
        
        if let Some(path) = command_path {
            println!("Resolved marker command path: {:?}", path);
            assert!(path.exists(), "Resolved command path should exist");
        }
    }

    #[tokio::test]
    async fn test_marker_installation_status() {
        let processor = PdfProcessor::new();
        let status = processor.get_marker_installation_status().await;
        
        println!("Marker installation status: {:?}", status);
        
        // Should detect marker as available
        assert!(status.is_available, "Marker should be detected as available");
        
        // Should detect virtual environment installation
        assert_eq!(status.installation_type, MarkerInstallationType::VirtualEnvironment, 
                  "Should detect virtual environment installation");
        
        // Should have a command path
        assert!(status.command_path.is_some(), "Should have a command path");
        
        // Should not have error messages when available
        assert!(status.error_message.is_none(), "Should not have error message when available");
        assert!(status.suggested_action.is_none(), "Should not have suggested action when available");
    }

    #[tokio::test]
    async fn test_marker_executable_verification() {
        let resolver = MarkerCommandResolver::new().await;
        
        if let Some(venv_path) = resolver.get_venv_path() {
            if let Some(marker_path) = resolver.get_venv_marker_path(venv_path) {
                let is_working = resolver.verify_marker_executable_path(&marker_path).await;
                assert!(is_working, "Marker executable should be working");
                println!("Verified marker executable at: {:?}", marker_path);
            }
        }
    }

    #[tokio::test]
    async fn test_pdf_processing_with_marker() {
        // This test requires a sample PDF file
        // For now, we'll just test that the method doesn't panic and handles missing files gracefully
        let processor = PdfProcessor::new();
        let options = MarkerOptions::default();
        
        let result = processor.extract_with_marker("/nonexistent/file.pdf", options).await;
        
        // Should return an error for non-existent file
        assert!(result.is_err(), "Should return error for non-existent file");
        
        if let Err(PdfError::ExtractionError(msg)) = result {
            assert!(msg.contains("File not found"), "Error should mention file not found");
            println!("Expected error for non-existent file: {}", msg);
        }
    }

    #[tokio::test]
    async fn test_error_message_generation() {
        let processor = PdfProcessor::new();
        let resolver = MarkerCommandResolver::new().await;
        
        // Test different installation status scenarios
        let status_not_found = MarkerInstallationStatus::not_found();
        let error_msg = processor.generate_installation_error_message(&status_not_found);
        assert!(error_msg.contains("setup_marker.sh"), "Error message should mention setup script");
        println!("Not found error message: {}", error_msg);
        
        let status_venv_missing = MarkerInstallationStatus::venv_exists_but_marker_missing();
        let error_msg = processor.generate_installation_error_message(&status_venv_missing);
        assert!(error_msg.contains("virtual environment found"), "Error message should mention virtual environment");
        assert!(error_msg.contains("setup_marker.sh"), "Error message should mention setup script");
        println!("Venv missing error message: {}", error_msg);
    }

    #[tokio::test]
    async fn test_virtual_environment_detection() {
        let resolver = MarkerCommandResolver::new().await;
        
        // Test that we can detect the marker_env directory
        let marker_env_path = PathBuf::from("marker_env");
        let is_valid_venv = resolver.detect_marker_env_directory(&marker_env_path).await;
        
        if marker_env_path.exists() {
            assert!(is_valid_venv, "Should detect marker_env as valid virtual environment");
            println!("Successfully detected virtual environment at: {:?}", marker_env_path);
        } else {
            println!("marker_env directory not found, skipping virtual environment detection test");
        }
    }

    #[tokio::test]
    async fn test_command_resolution_priority() {
        let resolver = MarkerCommandResolver::new().await;
        
        // Test that virtual environment is preferred over global installation
        if let Some(resolved_path) = resolver.resolve_marker_command().await {
            let path_str = resolved_path.to_string_lossy();
            
            // If we have a virtual environment, the resolved path should include it
            if resolver.get_venv_path().is_some() {
                assert!(path_str.contains("marker_env") || path_str.contains("venv"), 
                       "Should prefer virtual environment installation: {}", path_str);
                println!("Correctly prioritized virtual environment: {}", path_str);
            }
        }
    }

    #[tokio::test]
    async fn test_environment_setup() {
        let processor = PdfProcessor::new();
        let venv_path = PathBuf::from("marker_env");
        
        if venv_path.exists() {
            let mut cmd = tokio::process::Command::new("echo");
            processor.setup_venv_environment(&mut cmd, &venv_path);
            
            // Test that environment variables are set correctly
            // This is a basic test - in a real scenario we'd check the actual environment
            println!("Environment setup completed for virtual environment");
        }
    }
}

#[cfg(test)]
mod unit_tests {
    use super::super::*;

    #[test]
    fn test_marker_installation_status_creation() {
        let status = MarkerInstallationStatus::not_found();
        assert!(!status.is_available);
        assert_eq!(status.installation_type, MarkerInstallationType::NotFound);
        assert!(status.error_message.is_some());
        assert!(status.suggested_action.is_some());

        let status = MarkerInstallationStatus::virtual_environment("/path/to/marker".to_string());
        assert!(status.is_available);
        assert_eq!(status.installation_type, MarkerInstallationType::VirtualEnvironment);
        assert!(status.command_path.is_some());
        assert!(status.error_message.is_none());

        let status = MarkerInstallationStatus::global_installation();
        assert!(status.is_available);
        assert_eq!(status.installation_type, MarkerInstallationType::Global);
        assert!(status.error_message.is_none());

        let status = MarkerInstallationStatus::venv_exists_but_marker_missing();
        assert!(!status.is_available);
        assert_eq!(status.installation_type, MarkerInstallationType::VenvExistsButMarkerMissing);
        assert!(status.error_message.is_some());
        assert!(status.suggested_action.is_some());
    }

    #[test]
    fn test_marker_options_default() {
        let options = MarkerOptions::default();
        assert!(!options.extract_images);
        assert!(!options.use_llm);
        assert!(options.format_lines);
        assert!(!options.force_ocr);
        assert!(options.prefer_marker);
        assert!(options.gemini_api_key.is_none());
    }

    #[test]
    fn test_pdf_error_types() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "File not found");
        let pdf_error = PdfError::from(io_error);
        
        match pdf_error {
            PdfError::IoError(_) => {
                // Expected
            }
            _ => panic!("Should convert to IoError"),
        }

        let extraction_error = PdfError::ExtractionError("Test error".to_string());
        match extraction_error {
            PdfError::ExtractionError(msg) => {
                assert_eq!(msg, "Test error");
            }
            _ => panic!("Should be ExtractionError"),
        }
    }
}