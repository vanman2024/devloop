#!/bin/bash

# Test script for Feature Creation Agent

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Feature Creation Agent Test Suite${NC}"
echo -e "=================================="

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo -e "\n${YELLOW}Checking dependencies...${NC}"
MISSING_DEPS=0

if ! command_exists python3; then
  echo -e "${RED}Python 3 is not installed${NC}"
  MISSING_DEPS=1
fi

if ! command_exists node; then
  echo -e "${RED}Node.js is not installed${NC}"
  MISSING_DEPS=1
fi

if [ $MISSING_DEPS -eq 1 ]; then
  echo -e "${RED}Please install missing dependencies and try again${NC}"
  exit 1
fi

echo -e "${GREEN}All dependencies found${NC}"

# Run Python unit tests
echo -e "\n${YELLOW}Running Python unit tests...${NC}"
cd /mnt/c/Users/angel/Devloop/agents/planning/feature_creation
python3 -m unittest discover -s tests -p "test_*.py"
PYTHON_RESULT=$?

if [ $PYTHON_RESULT -eq 0 ]; then
  echo -e "${GREEN}Python unit tests passed${NC}"
else
  echo -e "${RED}Python unit tests failed${NC}"
fi

# Check if API server is running
echo -e "\n${YELLOW}Checking if API server is running...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/health | grep -q "200"; then
  echo -e "${GREEN}API server is running${NC}"
  SERVER_RUNNING=1
else
  echo -e "${YELLOW}API server is not running, skipping API tests${NC}"
  SERVER_RUNNING=0
fi

# Run API tests if server is running
if [ $SERVER_RUNNING -eq 1 ]; then
  echo -e "\n${YELLOW}Running API tests...${NC}"
  cd /mnt/c/Users/angel/Devloop/api/tests
  node test_feature_creation_api.js
  API_RESULT=$?
  
  if [ $API_RESULT -eq 0 ]; then
    echo -e "${GREEN}API tests passed${NC}"
  else
    echo -e "${RED}API tests failed${NC}"
  fi
else
  API_RESULT=0  # Skip API test result
fi

# Print summary
echo -e "\n${BLUE}Test Summary${NC}"
echo -e "============="

if [ $PYTHON_RESULT -eq 0 ] && [ $API_RESULT -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed${NC}"
  exit 1
fi