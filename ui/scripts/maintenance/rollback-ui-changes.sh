#!/bin/bash
# Rollback UI changes script

UI_PATH="/mnt/c/Users/angel/Devloop/system-core/ui-system"
ARCHIVE_PATH="$UI_PATH/archive"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Banner
echo "========================================"
echo "  Devloop UI System Rollback Tool"
echo "========================================"
echo
echo "This script will restore UI files from archived versions."
echo

# 1. First let's move the current react-app to a backup
echo "Creating backup of current React app..."
if [ -d "$UI_PATH/react-app" ]; then
  mv "$UI_PATH/react-app" "$UI_PATH/react-app_backup_$TIMESTAMP"
  echo "✓ Current React app backed up to: react-app_backup_$TIMESTAMP"
fi

# 2. Restore the original HTML-based UI files
echo
echo "Restoring original UI files..."

# Find the most recent archived files (by backup timestamp)
echo "Searching for archived UI files..."

# Key HTML files to restore
FEATURE_MANAGER_HTML_PATH=$(find "$ARCHIVE_PATH" -name "feature-manager.html_*" -type f | sort | tail -n 1)
INDEX_HTML_PATH=$(find "$ARCHIVE_PATH" -name "index.html_*" -type f | sort | tail -n 1)
FEATURE_MANAGER_DIR_PATH=$(find "$ARCHIVE_PATH" -name "feature-manager_*" -type d | sort | tail -n 1)
WSL_SERVER_PATH=$(find "$ARCHIVE_PATH" -name "wsl-server.js_*" -type f | sort | tail -n 1)

# Check if files were found
if [ -z "$FEATURE_MANAGER_HTML_PATH" ] || [ -z "$INDEX_HTML_PATH" ] || [ -z "$WSL_SERVER_PATH" ]; then
  echo "Error: Could not find all required archived files!"
  echo "Please check the $ARCHIVE_PATH directory."
  echo "Rollback aborted."
  exit 1
fi

# Restore the files
cp "$FEATURE_MANAGER_HTML_PATH" "$UI_PATH/feature-manager.html"
cp "$INDEX_HTML_PATH" "$UI_PATH/index.html"
cp "$WSL_SERVER_PATH" "$UI_PATH/wsl-server.js"

# Restore feature-manager directory if found
if [ -n "$FEATURE_MANAGER_DIR_PATH" ] && [ -d "$FEATURE_MANAGER_DIR_PATH" ]; then
  mkdir -p "$UI_PATH/feature-manager"
  cp -r "$FEATURE_MANAGER_DIR_PATH"/* "$UI_PATH/feature-manager/"
  echo "✓ Restored feature-manager directory"
fi

# 3. Restore component directories if needed
for dir in "components" "styles" "scripts" "assets"; do
  DIR_PATH=$(find "$ARCHIVE_PATH" -name "${dir}_*" -type d | sort | tail -n 1)
  if [ -n "$DIR_PATH" ] && [ -d "$DIR_PATH" ]; then
    mkdir -p "$UI_PATH/$dir"
    cp -r "$DIR_PATH"/* "$UI_PATH/$dir/"
    echo "✓ Restored $dir directory"
  fi
done

# 4. Create a simple launcher script for the original UI
echo
echo "Creating HTML UI launcher script..."
cat > "$UI_PATH/launch-html-ui.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Start Node.js server for WSL compatibility
echo "Starting UI server on port 3000..."
node wsl-server.js
EOF
chmod +x "$UI_PATH/launch-html-ui.sh"

# 5. Create a top-level launcher
echo "Creating top-level launcher script..."
cat > "/mnt/c/Users/angel/Devloop/launch-html-ui.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Devloop HTML UI Launcher (Original)"
echo "========================================"
echo

# Launch the original HTML UI
./system-core/ui-system/launch-html-ui.sh
EOF
chmod +x "/mnt/c/Users/angel/Devloop/launch-html-ui.sh"

echo
echo "✓ Rollback completed successfully!"
echo
echo "To launch the original HTML UI, run:"
echo "  ./launch-html-ui.sh"
echo
echo "If you need to go back to the React UI, all files have been preserved"
echo "in: system-core/ui-system/react-app_backup_$TIMESTAMP"
echo