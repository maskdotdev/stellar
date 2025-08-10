# Design Document

## Overview

This design addresses the PDF processing dependency issue where the `marker_single` command is not available in the system PATH because it's installed in a virtual environment. The solution involves modifying the PDF processor to intelligently locate and execute the marker_single command from the appropriate environment.

## Architecture

The fix will be implemented in the Rust backend's PDF processor module (`src-tauri/src/pdf_processor.rs`) with the following key changes:

1. **Enhanced Command Resolution**: Modify the marker availability check and execution to look in multiple locations
2. **Virtual Environment Detection**: Add logic to detect and use the virtual environment when available
3. **Fallback Strategy**: Implement a priority-based approach for finding the marker_single command
4. **Improved Error Messages**: Provide more specific guidance based on the detected installation state

## Components and Interfaces

### 1. MarkerCommandResolver

A new internal component that handles the logic for finding and executing the marker_single command:

```rust
struct MarkerCommandResolver {
    venv_path: Option<PathBuf>,
    global_available: bool,
}

impl MarkerCommandResolver {
    fn new() -> Self;
    async fn resolve_marker_command(&self) -> Option<PathBuf>;
    async fn is_marker_available_in_venv(&self) -> bool;
    async fn is_marker_available_globally(&self) -> bool;
    fn get_venv_marker_path(&self) -> Option<PathBuf>;
}
```

### 2. Modified PdfProcessor Methods

Update existing methods in the PdfProcessor:

- `is_marker_single_available()`: Enhanced to check multiple locations
- `extract_with_marker()`: Modified to use the resolved command path
- New method: `get_marker_installation_status()`: Returns detailed status for better error messages

### 3. Command Execution Strategy

The system will follow this priority order:
1. Virtual environment marker_single (if venv exists and command is available)
2. Global marker_single (if available in PATH)
3. Error with specific guidance based on what was found

## Data Models

### MarkerInstallationStatus

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MarkerInstallationStatus {
    pub is_available: bool,
    pub installation_type: MarkerInstallationType,
    pub command_path: Option<String>,
    pub error_message: Option<String>,
    pub suggested_action: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum MarkerInstallationType {
    VirtualEnvironment,
    Global,
    NotFound,
    VenvExistsButMarkerMissing,
}
```

## Error Handling

### Enhanced Error Messages

The system will provide specific error messages based on the detected state:

1. **Virtual environment exists but marker_single not found**: 
   - "Marker virtual environment found but marker_single is not installed. Please run: `./scripts/setup_marker.sh`"

2. **No virtual environment and no global installation**:
   - "Marker not found. Please run the setup script: `./scripts/setup_marker.sh`"

3. **Virtual environment activation issues**:
   - "Found marker_single in virtual environment but failed to execute. Please check the installation."

### Error Recovery

- Automatic fallback from venv to global installation
- Detailed logging for troubleshooting
- Graceful degradation with clear user guidance

## Testing Strategy

### Unit Tests

1. **MarkerCommandResolver Tests**:
   - Test virtual environment detection
   - Test command resolution priority
   - Test fallback behavior

2. **PdfProcessor Integration Tests**:
   - Test with virtual environment setup
   - Test with global installation
   - Test with no installation
   - Test with broken installation

### Integration Tests

1. **End-to-End PDF Processing**:
   - Test PDF processing with different marker installation states
   - Verify error messages match expected scenarios
   - Test command execution with proper environment activation

### Test Scenarios

1. Fresh system with no marker installation
2. System with virtual environment setup completed
3. System with global marker installation
4. System with both virtual environment and global installation
5. System with virtual environment but corrupted marker installation

## Implementation Details

### Virtual Environment Path Detection

The system will look for the virtual environment in these locations:
1. `./marker_env/` (relative to project root)
2. Environment variable `STELLAR_MARKER_VENV` if set
3. Standard virtual environment locations

### Command Execution

When using the virtual environment, the system will:
1. Construct the full path to the marker_single executable
2. Set appropriate environment variables (PATH, VIRTUAL_ENV)
3. Execute the command with the modified environment

### Backward Compatibility

The changes will maintain backward compatibility:
- Existing global installations will continue to work
- No changes to the public API
- Existing error handling patterns preserved