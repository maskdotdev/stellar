#!/bin/bash

# Test script to debug marker execution differences

set -e

echo "🔍 Debugging Marker Execution Differences"
echo "========================================"

# Test 1: Direct execution from shell
echo ""
echo "Test 1: Direct shell execution"
echo "------------------------------"
cd papers
echo "Working directory: $(pwd)"
echo "Command: marker_single att.pdf --output_format markdown --output_dir /tmp/marker_test_shell"
time source ../marker_env/bin/activate && marker_single att.pdf --output_format markdown --output_dir /tmp/marker_test_shell
cd ..

# Test 2: Check environment variables
echo ""
echo "Test 2: Environment variables when activated"
echo "--------------------------------------------"
source marker_env/bin/activate
echo "PATH: $PATH"
echo "VIRTUAL_ENV: $VIRTUAL_ENV"
echo "PYTHONPATH: $PYTHONPATH"
echo "Which marker_single: $(which marker_single)"

# Test 3: Check command execution from different directories
echo ""
echo "Test 3: Command execution from project root"
echo "-------------------------------------------"
echo "Working directory: $(pwd)"
echo "Command: marker_single papers/att.pdf --output_format markdown --output_dir /tmp/marker_test_root"
time marker_single papers/att.pdf --output_format markdown --output_dir /tmp/marker_test_root

# Test 4: Check if there are any differences in the resolved path
echo ""
echo "Test 4: Path resolution check"
echo "-----------------------------"
echo "Absolute path to marker_single: $(realpath $(which marker_single))"
echo "Relative path from src-tauri: $(realpath --relative-to=src-tauri $(which marker_single))"

# Test 5: Test with explicit environment variables
echo ""
echo "Test 5: Explicit environment variable setup"
echo "-------------------------------------------"
export VIRTUAL_ENV="$(pwd)/marker_env"
export PATH="$(pwd)/marker_env/bin:$PATH"
export PYTHONPATH="$(pwd)/marker_env/lib"
unset PYTHONHOME

echo "Manually set environment:"
echo "VIRTUAL_ENV: $VIRTUAL_ENV"
echo "PATH: $PATH"
echo "PYTHONPATH: $PYTHONPATH"
echo "PYTHONHOME: $PYTHONHOME"

echo "Testing with manual environment setup:"
time marker_single papers/att.pdf --output_format markdown --output_dir /tmp/marker_test_manual

echo ""
echo "🎯 Summary"
echo "=========="
echo "Check the timing differences between the different execution methods."
echo "This will help identify what's causing the timeout in the Rust code."