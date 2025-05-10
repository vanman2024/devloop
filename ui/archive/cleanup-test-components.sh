#!/bin/bash
# Script to clean up test components not used in production

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/mnt/c/Users/angel/devloop/ui"

# Function to safely remove a file
remove_file() {
  local file=$1
  
  if [ -f "$file" ]; then
    echo -e "${BLUE}Removing file: ${file}${NC}"
    rm "$file"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Successfully removed: ${file}${NC}"
    else
      echo -e "${RED}Failed to remove: ${file}${NC}"
    fi
  else
    echo -e "${YELLOW}File not found: ${file}${NC}"
  fi
}

# Show header
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}    Cleaning Test Components         ${NC}"
echo -e "${GREEN}=====================================${NC}"

# List of test components to remove
echo -e "${BLUE}Removing test components not used in production...${NC}"
remove_file "$BASE_DIR/src/pages/HMRTest.jsx"
remove_file "$BASE_DIR/src/components/HMRTest.jsx"
remove_file "$BASE_DIR/src/components/HotReloadTest.jsx"
remove_file "$BASE_DIR/src/components/TestHotReload.jsx"
remove_file "$BASE_DIR/src/components/cards/HotReloadTest.jsx"
remove_file "$BASE_DIR/src/components/cards/TestHotReload.jsx"
remove_file "$BASE_DIR/src/components/DatabaseTest.jsx"
remove_file "$BASE_DIR/src/components/system-health/TestComponent.jsx"
remove_file "$BASE_DIR/src/components/system-health/TestComponent.jsx.expected"
remove_file "$BASE_DIR/src/pages/HeaderDemo.jsx"
remove_file "$BASE_DIR/modal-test.jsx"
remove_file "$BASE_DIR/src/DiagnoseModalIssue.jsx"
remove_file "$BASE_DIR/src/FixIntegrationPage.jsx"
remove_file "$BASE_DIR/src/components/examples/DatabaseExample.jsx"
remove_file "$BASE_DIR/test-buttons.jsx"

echo -e "${GREEN}Test component cleanup completed${NC}"