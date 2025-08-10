# Requirements Document

## Introduction

The PDF processing functionality in Stellar currently fails when attempting to process PDFs using the Marker tool because the `marker_single` command is not available in the system PATH. The application has setup scripts that install Marker in a virtual environment (`marker_env`), but the Rust backend tries to execute `marker_single` directly without activating the virtual environment first. This creates a disconnect between the installation process and the runtime execution.

## Requirements

### Requirement 1

**User Story:** As a user, I want PDF processing to work seamlessly after running the setup script, so that I can process PDFs without encountering command not found errors.

#### Acceptance Criteria

1. WHEN the setup script has been run THEN the PDF processor SHALL be able to locate and execute the marker_single command
2. WHEN processing a PDF THEN the system SHALL automatically use the marker_single command from the virtual environment
3. IF the virtual environment is not activated THEN the system SHALL activate it before executing marker_single

### Requirement 2

**User Story:** As a user, I want the system to provide clear guidance when Marker is not properly installed, so that I can resolve the issue quickly.

#### Acceptance Criteria

1. WHEN marker_single is not available THEN the system SHALL provide specific instructions for running the setup script
2. WHEN the virtual environment exists but marker_single fails THEN the system SHALL suggest rerunning the setup script
3. WHEN checking marker availability THEN the system SHALL look in both the global PATH and the virtual environment

### Requirement 3

**User Story:** As a developer, I want the PDF processing code to be robust and handle different installation scenarios, so that the application works across different environments.

#### Acceptance Criteria

1. WHEN marker_single is available globally THEN the system SHALL use the global installation
2. WHEN marker_single is only available in the virtual environment THEN the system SHALL use the virtual environment version
3. WHEN multiple marker installations exist THEN the system SHALL prefer the virtual environment version for consistency

### Requirement 4

**User Story:** As a user, I want the setup process to be reliable and create a working installation, so that I don't have to troubleshoot installation issues.

#### Acceptance Criteria

1. WHEN running the setup script THEN it SHALL verify that marker_single is properly installed and executable
2. WHEN the setup completes THEN it SHALL test the marker_single command to ensure it works
3. IF the setup fails THEN it SHALL provide clear error messages and suggested solutions