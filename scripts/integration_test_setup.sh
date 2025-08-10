#!/bin/bash

# Integration test setup script for PDF processing fix

set -e  # Exit on any error

echo "🧪 Running PDF Processing Integration Tests..."

# Function to print test results
print_test_result() {
    local test_name="$1"
    local result="$2"
    if [ "$result" = "PASS" ]; then
        echo "✅ $test_name: PASSED"
    else
        echo "❌ $test_name: FAILED"
    fi
}

# Test 1: Check if marker_env directory exists
echo ""
echo "Test 1: Virtual Environment Detection"
if [ -d "marker_env" ]; then
    print_test_result "Virtual environment directory exists" "PASS"
else
    print_test_result "Virtual environment directory exists" "FAIL"
    echo "   Expected: marker_env directory should exist"
    echo "   Actual: marker_env directory not found"
fi

# Test 2: Check if marker_single executable exists in venv
echo ""
echo "Test 2: Marker Executable Detection"
if [ -f "marker_env/bin/marker_single" ]; then
    print_test_result "Marker executable exists in venv" "PASS"
else
    print_test_result "Marker executable exists in venv" "FAIL"
    echo "   Expected: marker_env/bin/marker_single should exist"
    echo "   Actual: marker_single not found in virtual environment"
fi

# Test 3: Check if marker_single is executable and working
echo ""
echo "Test 3: Marker Executable Functionality"
if source marker_env/bin/activate && marker_single --help > /dev/null 2>&1; then
    print_test_result "Marker executable is working" "PASS"
else
    print_test_result "Marker executable is working" "FAIL"
    echo "   Expected: marker_single --help should execute successfully"
    echo "   Actual: marker_single command failed or not found"
fi

# Test 4: Run Rust integration tests
echo ""
echo "Test 4: Rust Integration Tests"
cd src-tauri
if cargo test integration_tests --quiet > /dev/null 2>&1; then
    print_test_result "Rust integration tests" "PASS"
else
    print_test_result "Rust integration tests" "FAIL"
    echo "   Expected: All Rust integration tests should pass"
    echo "   Actual: One or more integration tests failed"
    echo "   Run 'cargo test integration_tests' for details"
fi
cd ..

# Test 5: Check marker availability through Tauri command (if app is running)
echo ""
echo "Test 5: Application Integration"
echo "ℹ️  To test the full application integration:"
echo "   1. Start the application: npm run tauri dev"
echo "   2. Try processing a PDF file"
echo "   3. Check that marker is detected as available"

echo ""
echo "🎯 Integration Test Summary"
echo "================================"
echo "These tests verify that the PDF processing fix is working correctly."
echo "If all tests pass, the marker installation should be properly detected"
echo "and PDF processing should work without the 'command not found' error."
echo ""
echo "If any tests fail, please:"
echo "1. Run the setup script: ./scripts/setup_marker.sh"
echo "2. Verify the virtual environment is properly created"
echo "3. Check that marker_single is installed and executable"
echo ""