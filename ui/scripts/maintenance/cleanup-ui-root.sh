#\!/bin/bash

# Script to clean up UI scripts from root directory
# PHYSICALLY moving them to React app structure

ROOT_DIR="/mnt/c/Users/angel/Devloop"
TARGET_DIR="$ROOT_DIR/system-core/ui-system/react-app/scripts"
cd "$ROOT_DIR"

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║              UI SCRIPTS PHYSICAL CLEANUP                  ║${NC}"
  echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
}

# Print header
print_header
echo -e "${BLUE}This script will PHYSICALLY MOVE UI scripts from the root directory${NC}"
echo -e "${BLUE}All scripts will be moved to the React app structure${NC}"
echo

# List of UI scripts to handle with their target directories
UI_SCRIPTS_DEV=(
  "add-ui-component.sh"
  "create-ui-feature.sh"
  "create-ui-sandbox.sh"
  "install-ui-dev-framework.sh"
  "integrate-ui-feature.sh"
  "run-feature-ui.sh"
  "setup-ui-preview.sh"
)

UI_SCRIPTS_LAUNCHERS=(
  "launch-devloop-ui.sh"
  "launch-react-ui.sh"
  "launch-react-feature-manager.sh"
  "launch-ui-bg.sh"
  "launch-ui-direct.sh"
  "launch-ui-preview.sh"
)

UI_SCRIPTS_MAINTENANCE=(
  "cleanup-ui-files.sh"
  "cleanup-ui-folders.sh"
  "cleanup-ui.sh"
  "fix-ui.sh"
  "rollback-ui-changes.sh"
  "stop-ui.sh"
)

UI_SCRIPTS_UTILITIES=(
  "open-ui.sh"
  "ui-nl-command.sh"
  "view-ui.sh"
  "view-feature-manager.sh"
  "view-feature-prototype.sh"
)

# Exclusion list - these will be symlinked instead
EXCLUDE=(
  "launch-ui.sh"
  "unified-ui.sh"
)

# Check if files exist and count how many
TO_MOVE=0

for script in "${UI_SCRIPTS_DEV[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    TO_MOVE=$((TO_MOVE + 1))
    echo -e "${BLUE}Will move:${NC} $script → scripts/development/"
  fi
done

for script in "${UI_SCRIPTS_LAUNCHERS[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    TO_MOVE=$((TO_MOVE + 1))
    echo -e "${BLUE}Will move:${NC} $script → scripts/launchers/"
  fi
done

for script in "${UI_SCRIPTS_MAINTENANCE[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    TO_MOVE=$((TO_MOVE + 1))
    echo -e "${BLUE}Will move:${NC} $script → scripts/maintenance/"
  fi
done

for script in "${UI_SCRIPTS_UTILITIES[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    TO_MOVE=$((TO_MOVE + 1))
    echo -e "${BLUE}Will move:${NC} $script → scripts/utilities/"
  fi
done

echo
echo -e "${YELLOW}$TO_MOVE${NC} scripts will be physically moved to React app structure"
echo

# Confirm with user
read -p "Proceed with physical move? (y/n) " -n 1 -r
echo
if [[ \! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Operation cancelled.${NC}"
  exit 1
fi

# Create a unified launcher script in the root
cat > "$ROOT_DIR/ui.sh" << 'EOL'
#\!/bin/bash

# Central UI Script for Devloop
# This is a symlink to the actual implementation in system-core/ui-system/react-app/scripts

# Navigate to project root directory
ROOT_DIR="/mnt/c/Users/angel/Devloop"
SCRIPT_DIR="$ROOT_DIR/system-core/ui-system/react-app/scripts/launchers"

cd "$ROOT_DIR"

# Check if the main launcher exists
if [ -f "$SCRIPT_DIR/launch-ui.sh" ]; then
  # Forward all arguments to the main launcher
  "$SCRIPT_DIR/launch-ui.sh" "$@"
else
  echo "Error: UI launcher script not found\!"
  echo "Expected location: $SCRIPT_DIR/launch-ui.sh"
  exit 1
fi
EOL

chmod +x "$ROOT_DIR/ui.sh"
echo -e "${GREEN}Created:${NC} $ROOT_DIR/ui.sh (central UI launcher)"

# Move files to their target directories
mkdir -p "$TARGET_DIR/development" "$TARGET_DIR/launchers" "$TARGET_DIR/maintenance" "$TARGET_DIR/utilities"

for script in "${UI_SCRIPTS_DEV[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    mv "$ROOT_DIR/$script" "$TARGET_DIR/development/"
    echo -e "${GREEN}Moved:${NC} $script → system-core/ui-system/react-app/scripts/development/"
  fi
done

for script in "${UI_SCRIPTS_LAUNCHERS[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    mv "$ROOT_DIR/$script" "$TARGET_DIR/launchers/"
    echo -e "${GREEN}Moved:${NC} $script → system-core/ui-system/react-app/scripts/launchers/"
  fi
done

for script in "${UI_SCRIPTS_MAINTENANCE[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    mv "$ROOT_DIR/$script" "$TARGET_DIR/maintenance/"
    echo -e "${GREEN}Moved:${NC} $script → system-core/ui-system/react-app/scripts/maintenance/"
  fi
done

for script in "${UI_SCRIPTS_UTILITIES[@]}"; do
  if [ -f "$ROOT_DIR/$script" ]; then
    mv "$ROOT_DIR/$script" "$TARGET_DIR/utilities/"
    echo -e "${GREEN}Moved:${NC} $script → system-core/ui-system/react-app/scripts/utilities/"
  fi
done

# Remove original launch-ui.sh if it exists
if [ -f "$ROOT_DIR/launch-ui.sh" ]; then
  rm "$ROOT_DIR/launch-ui.sh"
  echo -e "${GREEN}Removed:${NC} launch-ui.sh (replaced by ui.sh)"
fi

# Remove unified-ui.sh if it exists
if [ -f "$ROOT_DIR/unified-ui.sh" ]; then
  rm "$ROOT_DIR/unified-ui.sh"
  echo -e "${GREEN}Removed:${NC} unified-ui.sh (replaced by ui.sh)"
fi

echo
echo -e "${GREEN}Cleanup complete\!${NC}"
echo -e "${BLUE}You can now use:${NC}"
echo "  ./ui.sh                     - For all UI operations"
echo
echo -e "${YELLOW}Examples:${NC}"
echo "  ./ui.sh start               - Start the development server"
echo "  ./ui.sh production          - Start the production server"
echo "  ./ui.sh stop                - Stop all servers"
echo "  ./ui.sh fix                 - Fix common UI issues"
echo "  ./ui.sh status              - Check server status"
echo "  ./ui.sh help                - Show all available commands"
echo
echo -e "${BLUE}All scripts have been physically moved to:${NC}"
echo "  ./system-core/ui-system/react-app/scripts/"
echo
echo -e "${YELLOW}Note: Your React app is now properly organized with a central launcher script.${NC}"
exit 0
