#!/bin/bash

# Setup script for Marker PDF processing server

set -e  # Exit on any error

echo "Setting up Marker PDF processor..."

# Function to print error messages and exit
error_exit() {
    echo "ERROR: $1" >&2
    echo "Setup failed. Please check the error above and try again." >&2
    exit 1
}

# Function to verify marker_single installation
verify_marker_installation() {
    echo "Verifying marker_single installation..."
    
    # Check if marker_single command exists
    if ! command -v marker_single &> /dev/null; then
        error_exit "marker_single command not found in PATH after installation. Installation may have failed."
    fi
    
    # Test marker_single command with --help flag
    echo "Testing marker_single command..."
    if ! marker_single --help &> /dev/null; then
        error_exit "marker_single command exists but is not executable or has issues. Please check the installation."
    fi
    
    # Get marker_single version for verification
    local version_output
    if version_output=$(marker_single --version 2>&1); then
        echo "✓ marker_single is properly installed and executable"
        echo "  Version: $version_output"
    else
        echo "⚠ marker_single is executable but version check failed"
        echo "  This may indicate a partial installation"
    fi
}

# Function to verify virtual environment setup
verify_venv_setup() {
    echo "Verifying virtual environment setup..."
    
    # Check if virtual environment directory exists
    if [ ! -d "marker_env" ]; then
        error_exit "Virtual environment directory 'marker_env' was not created"
    fi
    
    # Check if virtual environment activation script exists
    if [ ! -f "marker_env/bin/activate" ]; then
        error_exit "Virtual environment activation script not found"
    fi
    
    # Check if we're in the virtual environment
    if [ -z "$VIRTUAL_ENV" ]; then
        error_exit "Virtual environment is not activated"
    fi
    
    echo "✓ Virtual environment is properly set up and activated"
}

# Check if Python 3.8+ is installed
if ! command -v python3 &> /dev/null; then
    error_exit "Python 3 is required but not installed. Please install Python 3.8+ first."
fi

# Check Python version
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
if ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)"; then
    error_exit "Python 3.8+ is required. Found Python $python_version"
fi

echo "✓ Python $python_version detected"

# Create virtual environment
echo "Creating virtual environment..."
if ! python3 -m venv marker_env; then
    error_exit "Failed to create virtual environment"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source marker_env/bin/activate || error_exit "Failed to activate virtual environment"

# Verify virtual environment setup
verify_venv_setup

# Upgrade pip to latest version
echo "Upgrading pip..."
if ! pip install --upgrade pip; then
    error_exit "Failed to upgrade pip"
fi

# Install Marker
echo "Installing marker-pdf..."
if ! pip install -U marker-pdf; then
    error_exit "Failed to install marker-pdf. Check your internet connection and try again."
fi

# Install API server dependencies
echo "Installing API server dependencies..."
if ! pip install -U uvicorn fastapi python-multipart; then
    error_exit "Failed to install API server dependencies"
fi

# Verify marker_single installation
verify_marker_installation

echo ""
echo "🎉 Marker setup completed successfully!"
echo ""
echo "Installation Summary:"
echo "- Virtual environment: $(pwd)/marker_env"
echo "- marker_single command: $(which marker_single)"
echo "- Python version: $python_version"
echo ""
echo "To start the Marker server:"
echo "1. Activate the virtual environment: source marker_env/bin/activate"
echo "2. Start the server: marker_server --port 8001"
echo "3. The API will be available at http://localhost:8001"
echo "4. View docs at http://localhost:8001/docs"
echo ""
echo "To process PDFs directly:"
echo "1. Activate the virtual environment: source marker_env/bin/activate"
echo "2. Use: marker_single /path/to/your/file.pdf /path/to/output/directory" 