# Implementation Plan

- [x] 1. Create MarkerCommandResolver struct and basic functionality
  - Add new MarkerCommandResolver struct with fields for venv_path and global_available
  - Implement constructor and basic path detection methods
  - Write unit tests for the resolver struct initialization
  - _Requirements: 3.1, 3.2_

- [x] 2. Implement virtual environment detection logic
  - Code the logic to detect marker_env directory in project root
  - Add method to check if marker_single exists in the virtual environment
  - Implement path construction for venv marker_single executable
  - Write unit tests for virtual environment detection
  - _Requirements: 1.1, 3.2_

- [x] 3. Implement global marker detection
  - Add method to check if marker_single is available globally in PATH
  - Implement fallback logic when virtual environment is not available
  - Write unit tests for global marker detection
  - _Requirements: 3.1, 3.3_

- [x] 4. Create MarkerInstallationStatus data model
  - Define MarkerInstallationStatus struct with all required fields
  - Implement MarkerInstallationType enum with all variants
  - Add serialization/deserialization support
  - Write unit tests for the data models
  - _Requirements: 2.1, 2.2_

- [x] 5. Implement command resolution with priority logic
  - Add resolve_marker_command method that follows priority order (venv first, then global)
  - Implement logic to return the appropriate command path based on availability
  - Handle edge cases where multiple installations exist
  - Write unit tests for command resolution priority
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Update is_marker_single_available method
  - Modify existing is_marker_single_available to use MarkerCommandResolver
  - Replace simple PATH check with comprehensive availability check
  - Ensure backward compatibility with existing code
  - Write unit tests for the updated availability check
  - _Requirements: 1.1, 2.3_

- [x] 7. Implement get_marker_installation_status method
  - Create new method that returns detailed MarkerInstallationStatus
  - Include logic to determine installation type and provide appropriate messages
  - Add suggested actions based on detected installation state
  - Write unit tests for installation status detection
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8. Update extract_with_marker method to use resolved command path
  - Modify extract_with_marker to use MarkerCommandResolver for command execution
  - Update command construction to use resolved path instead of hardcoded "marker_single"
  - Handle environment variable setup when using virtual environment
  - Write unit tests for command execution with different installation types
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 9. Enhance error messages with specific guidance
  - Update error messages in extract_with_marker to use installation status information
  - Provide specific instructions based on MarkerInstallationType
  - Include references to setup script when appropriate
  - Write unit tests for error message generation
  - _Requirements: 2.1, 2.2, 4.3_

- [x] 10. Update check_marker_availability command in pdf.rs
  - Modify the Tauri command to use the new installation status method
  - Return detailed information about marker availability to the frontend
  - Update error handling to provide better user guidance
  - Write integration tests for the updated command
  - _Requirements: 2.1, 2.3_

- [x] 11. Update setup script to verify installation
  - Modify setup_marker.sh to test marker_single command after installation
  - Add verification step that confirms the command is executable
  - Include error handling for failed installations
  - Write tests for the setup script verification
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 12. Add integration tests for end-to-end PDF processing
  - Create tests that simulate different installation scenarios
  - Test PDF processing with virtual environment setup
  - Test fallback to global installation when venv is not available
  - Verify error messages match expected scenarios for each installation state
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_