#!/bin/bash

# Start Marker PDF processing server

echo "Starting Marker PDF processor server..."

# Check if virtual environment exists
if [ ! -d "marker_env" ]; then
    echo "Marker environment not found. Running setup first..."
    ./scripts/setup_marker.sh
fi

# Activate virtual environment
source marker_env/bin/activate

# Start the server
echo "Starting Marker server on port 8001..."
marker_server --port 8001 