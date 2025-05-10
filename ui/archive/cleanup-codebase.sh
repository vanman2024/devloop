#!/bin/bash
# Comprehensive cleanup script for UI codebase

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Function to show header
show_header() {
  local title=$1
  echo -e "${CYAN}=====================================${NC}"
  echo -e "${CYAN}    $title    ${NC}"
  echo -e "${CYAN}=====================================${NC}"
}

# Create backup first
show_header "Creating Backup"
if ./run-working-state-detector.sh backup; then
  echo -e "${GREEN}Backup created successfully${NC}"
else
  read -p "Backup failed. Continue with cleanup? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Cleanup aborted${NC}"
    exit 1
  fi
fi

# 1. Clean test components
show_header "Cleaning Test Components"
find "$BASE_DIR/src" -type f -name "*Test*.jsx" | while read file; do
  # Skip essential files that have 'Test' in the name but are not test components
  if [[ "$file" == *"TestPassRate.jsx" ]]; then
    echo -e "${YELLOW}Skipping essential file: $file${NC}"
    continue
  fi
  remove_file "$file"
done

# 2. Clean backup files
show_header "Cleaning Backup Files"
find "$BASE_DIR/src" -name "*.bak" -type f | while read file; do
  remove_file "$file"
done

# 3. Clean one-off experiments
show_header "Cleaning One-off Experiments"
find "$BASE_DIR" -type f -name "*test*.js" -o -name "*demo*.jsx" | while read file; do
  # Skip essential files
  if [[ "$file" == *"/test/"* || "$file" == *"/tests/"* || "$file" == *"DatabaseTest"* ]]; then
    echo -e "${YELLOW}Skipping essential file: $file${NC}"
    continue
  fi
  remove_file "$file"
done

# 4. Clean component backups
show_header "Cleaning Component Backups"
find "$BASE_DIR/component-backups" -type f | while read file; do
  remove_file "$file"
done

# 5. Remove '.expected' files
show_header "Cleaning .expected Files"
find "$BASE_DIR/src" -name "*.expected" -type f | while read file; do
  remove_file "$file"
done

# 6. Clean broken files
show_header "Cleaning Broken Files"
find "$BASE_DIR" -name "*.broken" -type f | while read file; do
  remove_file "$file"
done

# Final message
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}    Cleanup Complete    ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "${YELLOW}NOTE: You may need to manually update App.jsx and other files to remove references to deleted components${NC}"