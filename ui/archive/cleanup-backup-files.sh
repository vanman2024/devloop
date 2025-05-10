#!/bin/bash
# Script to clean up backup files and one-off experiments

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
echo -e "${GREEN}  Cleaning Backup Files & One-offs   ${NC}"
echo -e "${GREEN}=====================================${NC}"

# Remove backup files
echo -e "${BLUE}Removing backup files (.bak extensions)...${NC}"
# Find all .bak files recursively
find "$BASE_DIR/src" -name "*.bak" -type f | while read file; do
  remove_file "$file"
done

# Remove specific one-off experiments
echo -e "${BLUE}Removing one-off experiments...${NC}"
remove_file "$BASE_DIR/component-backups/App.jsx.broken"
remove_file "$BASE_DIR/component-backups/FeatureDetailsModal_20250505102751.jsx"
remove_file "$BASE_DIR/port-test.js"

echo -e "${GREEN}Backup files and one-off experiment cleanup completed${NC}"