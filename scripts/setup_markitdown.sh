#!/bin/bash

# Setup script for MarkItDown PDF processing

echo "Setting up MarkItDown PDF processor..."

# Check if Python 3.8+ is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3.8+ first."
    exit 1
fi

# Create virtual environment
python3 -m venv markitdown_env
source markitdown_env/bin/activate

# Install MarkItDown with PDF support
pip install -U markitdown[pdf]

echo "MarkItDown setup complete!"
echo ""
echo "To use MarkItDown:"
echo "1. Activate the virtual environment: source markitdown_env/bin/activate"
echo "2. Use the markitdown command: markitdown document.pdf"
echo "3. Or use it through the Stellar application by selecting 'MarkItDown' processing method"
echo ""
echo "MarkItDown Features:"
echo "- Lightweight and fast"
echo "- Good balance of speed and quality"
echo "- Supports multiple file formats"
echo "- Microsoft-backed tool" 