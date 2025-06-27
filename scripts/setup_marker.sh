#!/bin/bash

# Setup script for Marker PDF processing server

echo "Setting up Marker PDF processor..."

# Check if Python 3.8+ is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3.8+ first."
    exit 1
fi

# Create virtual environment
python3 -m venv marker_env
source marker_env/bin/activate

# Install Marker
pip install -U marker-pdf

# Install API server dependencies
pip install -U uvicorn fastapi python-multipart

echo "Marker setup complete!"
echo ""
echo "To start the Marker server:"
echo "1. Activate the virtual environment: source marker_env/bin/activate"
echo "2. Start the server: marker_server --port 8001"
echo "3. The API will be available at http://localhost:8001"
echo "4. View docs at http://localhost:8001/docs" 