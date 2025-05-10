#!/bin/bash

# Cleanup script for Devloop UI system
# This script organizes the UI system directory by:
# 1. Moving old files to an archive directory
# 2. Keeping only the React application

# Set variables
UI_PATH="system-core/ui-system"
ARCHIVE_DIR="$UI_PATH/archive"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Create banner
echo "============================================="
echo "  Devloop UI System Cleanup Tool"
echo "============================================="
echo
echo "This script will clean up the UI system directory"
echo "by archiving old files and keeping only the React app."
echo
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Function to archive a directory or file
archive_item() {
  local item="$1"
  local base_name=$(basename "$item")
  
  # Skip if it's already in the archive
  if [[ "$item" == *"/archive/"* ]]; then
    return
  fi
  
  # Skip node_modules
  if [[ "$base_name" == "node_modules" ]]; then
    return
  fi
  
  # Skip the react-app directory we want to keep
  if [[ "$item" == "$UI_PATH/react-app" ]]; then
    return
  fi
  
  # Skip common files like README.md
  if [[ "$base_name" == "README.md" ]]; then
    return
  fi
  
  # Archive directories
  if [ -d "$item" ]; then
    # Create target directory
    local target="${ARCHIVE_DIR}/${base_name}_${TIMESTAMP}"
    echo "Archiving directory: $item → $target"
    mkdir -p "$target"
    
    # Copy files
    cp -r "$item"/* "$target" 2>/dev/null
    
    # Delete original if not the parent directory
    if [[ "$item" != "$UI_PATH" ]]; then
      rm -rf "$item"
    fi
    
  # Archive individual files
  elif [ -f "$item" ]; then
    if [[ "$item" != *"launch.sh"* && "$item" != *"README.md"* ]]; then
      echo "Moving file: $item → $ARCHIVE_DIR/"
      mv "$item" "${ARCHIVE_DIR}/${base_name}_${TIMESTAMP}"
    fi
  fi
}

# List all files and directories in UI_PATH except react-app
echo
echo "Starting cleanup process..."
echo

# Archive individual files in the UI_PATH root
for file in $UI_PATH/*.html $UI_PATH/*.js $UI_PATH/*.py $UI_PATH/*.css; do
  if [ -f "$file" ]; then
    archive_item "$file"
  fi
done

# Archive directories except react-app and archive
for dir in $UI_PATH/*/; do
  if [[ "$dir" != "$UI_PATH/react-app/" && "$dir" != "$ARCHIVE_DIR/" ]]; then
    archive_item "${dir%/}"
  fi
done

# Create a README.md file for the UI system directory
cat > "$UI_PATH/README.md" << EOF
# Devloop UI System

This directory contains the front-end implementation for the Devloop Feature Manager UI.

## Structure

- **react-app/** - Modern React implementation using Vite
- **archive/** - Legacy implementations and code for reference

## Getting Started

To launch the Feature Manager UI, use the provided script:

\`\`\`bash
# From the project root
./launch-feature-manager.sh
\`\`\`

## Development

The React application is built with:
- React 18
- Vite
- Tailwind CSS
- React Router

For more details, see [react-app/README.md](./react-app/README.md).
EOF

echo
echo "Cleanup complete!"
echo "All legacy implementations have been archived in: $ARCHIVE_DIR"
echo "The React application in $UI_PATH/react-app is now the primary UI implementation."
echo
echo "You can launch the application using:"
echo "  ./launch-feature-manager.sh"
echo