#!/bin/bash

# Define colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Flake8 is a linter that checks for syntax errors and style violations.
run_basic_flake8() {
    echo "Running basic flake8 checks..."
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=venv
    return $?
}
run_complex_flake8() {
    echo "Running complex flake8 checks..."
    flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics --exclude=venv
    return $?
}

# Mypy is a static type checker for Python.
run_mypy() {
    echo "Running mypy type checks..."
    mypy . --ignore-missing-imports
    return $?
}

show_success() {
    echo -e "\n${GREEN}==========================================${NC}"
    echo -e "${GREEN}✅ All selected tests passed successfully!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    exit 0
}
show_failure() {
    echo -e "\n${RED}==========================================${NC}"
    echo -e "${RED}❌ Tests failed!${NC}"
    echo -e "${RED}==========================================${NC}"
    exit 1
}

# Display usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Run specific tests or all tests"
    echo ""
    echo "Options:"
    echo "  -b, --basic-flake8    Run basic flake8 checks"
    echo "  -c, --complex-flake8  Run complex flake8 checks"
    echo "  -m, --mypy           Run mypy type checks"
    echo "  -a, --all            Run all tests (default if no options provided)"
    echo "  -h, --help           Show this help message"
    exit 1
}

# Initialize test status
FAILED=0

# Parse command line arguments
if [ $# -eq 0 ]; then
    # If no arguments provided, run all tests
    run_basic_flake8 || FAILED=1
    run_complex_flake8 || FAILED=1
    run_mypy || FAILED=1
else
    # Process arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            -b|--basic-flake8)
                run_basic_flake8 || FAILED=1
                ;;
            -c|--complex-flake8)
                run_complex_flake8 || FAILED=1
                ;;
            -m|--mypy)
                run_mypy || FAILED=1
                ;;
            -a|--all)
                run_basic_flake8 || FAILED=1
                run_complex_flake8 || FAILED=1
                run_mypy || FAILED=1
                ;;
            -h|--help)
                show_usage
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                ;;
        esac
        shift
    done
fi

# Show final result
if [ $FAILED -eq 0 ]; then
    show_success
else
    show_failure
fi 