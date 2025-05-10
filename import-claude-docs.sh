#!/bin/bash
# Import Claude-generated documentation into the Document Management System

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# Check for ANTHROPIC_API_KEY
if [[ -z "${ANTHROPIC_API_KEY}" ]]; then
  echo "Error: ANTHROPIC_API_KEY environment variable not set."
  echo "Please run: export ANTHROPIC_API_KEY=your_api_key_here"
  exit 1
fi

# Create required directories if they don't exist
mkdir -p "${SCRIPT_DIR}/knowledge_base/documents"
mkdir -p "${SCRIPT_DIR}/knowledge_base/cache"

# Function to show help message
show_help() {
  echo "Usage: ./import-claude-docs.sh [OPTIONS]"
  echo ""
  echo "Import Claude-generated markdown files into the Document Management System"
  echo ""
  echo "Options:"
  echo "  --all                Import all markdown files (not just Claude-generated)"
  echo "  --force              Force reimport of already imported files"
  echo "  --limit N            Limit to importing N files"
  echo "  --update-tracker     Just update the tracker without importing"
  echo "  --help               Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./import-claude-docs.sh              # Import new Claude-generated docs"
  echo "  ./import-claude-docs.sh --all        # Import all markdown files"
  echo "  ./import-claude-docs.sh --limit 10   # Import up to 10 new files"
  echo ""
}

# Parse arguments
ALL=false
FORCE=false
LIMIT=0
UPDATE_TRACKER=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --all) ALL=true ;;
    --force) FORCE=true ;;
    --limit) LIMIT="$2"; shift ;;
    --update-tracker) UPDATE_TRACKER=true ;;
    --help) show_help; exit 0 ;;
    *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
  esac
  shift
done

# Build command
CMD="python3 ${SCRIPT_DIR}/scripts/import_claude_docs.py"

if [ "$ALL" = false ]; then
  CMD="${CMD} --claude-only"
fi

if [ "$FORCE" = true ]; then
  CMD="${CMD} --force"
fi

if [ "$LIMIT" -gt 0 ]; then
  CMD="${CMD} --limit ${LIMIT}"
fi

if [ "$UPDATE_TRACKER" = true ]; then
  CMD="${CMD} --update-tracker"
fi

# Run the import script
echo "Starting import process..."
echo "Command: ${CMD}"
eval "${CMD}"

# Check for success
if [ $? -eq 0 ]; then
  echo "Import completed successfully!"
  echo "You can now view the documents in the Document Manager UI"
  
  # Display files in knowledge base
  echo ""
  echo "Files in the knowledge base:"
  ls -la "${SCRIPT_DIR}/knowledge_base/documents" | grep -v "^total" | tail -n 5
  echo "... and more"
  
  # Show command to launch Document Manager
  echo ""
  echo "To launch the Document Manager UI, run:"
  echo "cd ${SCRIPT_DIR}/ui && npm run dev"
else
  echo "Import failed. Check error messages above."
fi