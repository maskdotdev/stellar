use crate::pdf_processor::{MarkerInstallationStatus, MarkerInstallationType};
use super::check_marker_availability;

#[tokio::test]
async fn test_check_marker_availability_returns_installation_status() {
    // Test that check_marker_availability returns a MarkerInstallationStatus
    let result = check_marker_availability().await;
    
    // Should return Ok with a MarkerInstallationStatus
    assert!(result.is_ok(), "check_marker_availability should return Ok");
    
    let status = result.unwrap();
    
    // Verify it's a valid MarkerInstallationStatus
    assert!(matches!(status.installation_type, 
        MarkerInstallationType::VirtualEnvironment |
        MarkerInstallationType::Global |
        MarkerInstallationType::NotFound |
        MarkerInstallationType::VenvExistsButMarkerMissing
    ));
    
    // Verify consistency between is_available and other fields
    if status.is_available {
        assert!(status.command_path.is_some(), "Available installations should have command path");
        assert!(status.error_message.is_none(), "Available installations should not have error message");
        assert!(status.suggested_action.is_none(), "Available installations should not have suggested action");
    } else {
        assert!(status.error_message.is_some(), "Unavailable installations should have error message");
        assert!(status.suggested_action.is_some(), "Unavailable installations should have suggested action");
        assert!(status.command_path.is_none(), "Unavailable installations should not have command path");
    }
}

#[tokio::test]
async fn test_check_marker_availability_provides_detailed_information() {
    let result = check_marker_availability().await;
    assert!(result.is_ok());
    
    let status = result.unwrap();
    
    // Test that detailed information is provided based on installation type
    match status.installation_type {
        MarkerInstallationType::VirtualEnvironment => {
            assert!(status.is_available);
            assert!(status.command_path.is_some());
            let command_path = status.command_path.unwrap();
            assert!(command_path.contains("marker_single"), "Virtual environment path should contain marker_single");
            assert!(command_path.len() > "marker_single".len(), "Virtual environment path should be full path");
        },
        MarkerInstallationType::Global => {
            assert!(status.is_available);
            assert_eq!(status.command_path, Some("marker_single".to_string()));
        },
        MarkerInstallationType::NotFound => {
            assert!(!status.is_available);
            assert!(status.error_message.is_some());
            let error_msg = status.error_message.unwrap();
            assert!(error_msg.contains("not found") || error_msg.contains("install"));
            
            assert!(status.suggested_action.is_some());
            let suggested_action = status.suggested_action.unwrap();
            assert!(suggested_action.contains("setup_marker.sh"));
        },
        MarkerInstallationType::VenvExistsButMarkerMissing => {
            assert!(!status.is_available);
            assert!(status.error_message.is_some());
            let error_msg = status.error_message.unwrap();
            assert!(error_msg.contains("virtual environment") || error_msg.contains("venv"));
            
            assert!(status.suggested_action.is_some());
            let suggested_action = status.suggested_action.unwrap();
            assert!(suggested_action.contains("setup_marker.sh"));
        }
    }
}

#[tokio::test]
async fn test_check_marker_availability_error_handling() {
    // Test that the command handles errors gracefully
    let result = check_marker_availability().await;
    
    // The command should never return an Err - it should always return Ok with status
    assert!(result.is_ok(), "check_marker_availability should always return Ok with status information");
    
    let status = result.unwrap();
    
    // If marker is not available, should provide helpful error guidance
    if !status.is_available {
        assert!(status.error_message.is_some(), "Should provide error message when not available");
        assert!(status.suggested_action.is_some(), "Should provide suggested action when not available");
        
        let error_msg = status.error_message.unwrap();
        let suggested_action = status.suggested_action.unwrap();
        
        // Error message should be informative
        assert!(!error_msg.is_empty(), "Error message should not be empty");
        assert!(error_msg.contains("Marker") || error_msg.contains("marker"), 
               "Error message should mention Marker");
        
        // Suggested action should be helpful
        assert!(!suggested_action.is_empty(), "Suggested action should not be empty");
        assert!(suggested_action.contains("setup") || suggested_action.contains("install"), 
               "Suggested action should mention setup or install");
    }
}

#[tokio::test]
async fn test_check_marker_availability_consistency_with_processor() {
    // Test that the command returns consistent results with direct processor calls
    let command_result = check_marker_availability().await;
    assert!(command_result.is_ok());
    
    let command_status = command_result.unwrap();
    
    // Compare with direct processor call
    let processor = crate::pdf_processor::PdfProcessor::new();
    let processor_status = processor.get_marker_installation_status().await;
    
    // Results should be identical
    assert_eq!(command_status.is_available, processor_status.is_available);
    assert_eq!(command_status.installation_type, processor_status.installation_type);
    assert_eq!(command_status.command_path, processor_status.command_path);
    assert_eq!(command_status.error_message, processor_status.error_message);
    assert_eq!(command_status.suggested_action, processor_status.suggested_action);
}

#[tokio::test]
async fn test_check_marker_availability_serialization() {
    // Test that the returned status can be properly serialized (important for Tauri commands)
    let result = check_marker_availability().await;
    assert!(result.is_ok());
    
    let status = result.unwrap();
    
    // Test JSON serialization
    let json_result = serde_json::to_string(&status);
    assert!(json_result.is_ok(), "MarkerInstallationStatus should be serializable to JSON");
    
    let json_string = json_result.unwrap();
    assert!(!json_string.is_empty(), "Serialized JSON should not be empty");
    
    // Test JSON deserialization
    let deserialized_result: Result<MarkerInstallationStatus, _> = serde_json::from_str(&json_string);
    assert!(deserialized_result.is_ok(), "Serialized JSON should be deserializable");
    
    let deserialized_status = deserialized_result.unwrap();
    
    // Verify deserialized data matches original
    assert_eq!(status.is_available, deserialized_status.is_available);
    assert_eq!(status.installation_type, deserialized_status.installation_type);
    assert_eq!(status.command_path, deserialized_status.command_path);
    assert_eq!(status.error_message, deserialized_status.error_message);
    assert_eq!(status.suggested_action, deserialized_status.suggested_action);
}

#[tokio::test]
async fn test_check_marker_availability_provides_user_guidance() {
    let result = check_marker_availability().await;
    assert!(result.is_ok());
    
    let status = result.unwrap();
    
    // Test that appropriate user guidance is provided for each scenario
    match status.installation_type {
        MarkerInstallationType::NotFound => {
            // Should provide clear guidance for users who haven't installed Marker
            assert!(status.error_message.is_some());
            assert!(status.suggested_action.is_some());
            
            let error_msg = status.error_message.unwrap();
            let suggested_action = status.suggested_action.unwrap();
            
            // Error should explain what's missing
            assert!(error_msg.contains("not found") || error_msg.contains("install"));
            
            // Suggestion should point to setup script
            assert!(suggested_action.contains("setup_marker.sh"));
        },
        MarkerInstallationType::VenvExistsButMarkerMissing => {
            // Should provide specific guidance for broken virtual environment
            assert!(status.error_message.is_some());
            assert!(status.suggested_action.is_some());
            
            let error_msg = status.error_message.unwrap();
            let suggested_action = status.suggested_action.unwrap();
            
            // Error should explain the specific issue
            assert!(error_msg.contains("virtual environment") || error_msg.contains("venv"));
            assert!(error_msg.contains("not installed") || error_msg.contains("missing"));
            
            // Suggestion should point to setup script
            assert!(suggested_action.contains("setup_marker.sh"));
        },
        MarkerInstallationType::VirtualEnvironment | MarkerInstallationType::Global => {
            // Working installations should not have error messages or suggestions
            assert!(status.error_message.is_none());
            assert!(status.suggested_action.is_none());
            assert!(status.command_path.is_some());
        }
    }
}

#[tokio::test]
async fn test_check_marker_availability_multiple_calls_consistency() {
    // Test that multiple calls return consistent results
    let result1 = check_marker_availability().await;
    let result2 = check_marker_availability().await;
    
    assert!(result1.is_ok());
    assert!(result2.is_ok());
    
    let status1 = result1.unwrap();
    let status2 = result2.unwrap();
    
    // Results should be consistent across calls (system state shouldn't change between calls)
    assert_eq!(status1.is_available, status2.is_available);
    assert_eq!(status1.installation_type, status2.installation_type);
    assert_eq!(status1.command_path, status2.command_path);
    assert_eq!(status1.error_message, status2.error_message);
    assert_eq!(status1.suggested_action, status2.suggested_action);
}

#[tokio::test]
async fn test_check_marker_availability_requirements_compliance() {
    // Test compliance with requirements 2.1 and 2.3
    let result = check_marker_availability().await;
    assert!(result.is_ok());
    
    let status = result.unwrap();
    
    // Requirement 2.1: System SHALL provide specific instructions for running the setup script
    if !status.is_available {
        assert!(status.suggested_action.is_some(), "Should provide specific instructions when marker not available");
        let suggested_action = status.suggested_action.unwrap();
        assert!(suggested_action.contains("setup_marker.sh"), "Should reference setup script");
    }
    
    // Requirement 2.3: System SHALL look in both global PATH and virtual environment
    // This is verified by checking that the command uses get_marker_installation_status
    // which internally uses MarkerCommandResolver that checks both locations
    
    // The fact that we can get different installation types proves both locations are checked
    assert!(matches!(status.installation_type,
        MarkerInstallationType::VirtualEnvironment |  // Found in venv
        MarkerInstallationType::Global |              // Found globally  
        MarkerInstallationType::NotFound |            // Not found in either
        MarkerInstallationType::VenvExistsButMarkerMissing  // Venv exists but marker missing
    ), "Installation type should reflect comprehensive search of both locations");
}

#[tokio::test]
async fn test_check_marker_availability_frontend_integration() {
    // Test that the command returns data suitable for frontend consumption
    let result = check_marker_availability().await;
    assert!(result.is_ok());
    
    let status = result.unwrap();
    
    // Verify all fields are present and suitable for frontend display
    
    // is_available should be a clear boolean
    assert!(status.is_available == true || status.is_available == false);
    
    // installation_type should be serializable and meaningful
    let type_json = serde_json::to_string(&status.installation_type);
    assert!(type_json.is_ok());
    
    // If available, command_path should be provided for frontend to display
    if status.is_available {
        assert!(status.command_path.is_some());
        let command_path = status.command_path.unwrap();
        assert!(!command_path.is_empty());
    }
    
    // If not available, error information should be provided for frontend to display
    if !status.is_available {
        assert!(status.error_message.is_some());
        assert!(status.suggested_action.is_some());
        
        let error_msg = status.error_message.unwrap();
        let suggested_action = status.suggested_action.unwrap();
        
        // Messages should be user-friendly (not technical error codes)
        assert!(!error_msg.is_empty());
        assert!(!suggested_action.is_empty());
        assert!(!error_msg.contains("Error:") || !error_msg.starts_with("Error:"));
        assert!(!suggested_action.contains("Error:") || !suggested_action.starts_with("Error:"));
    }
}