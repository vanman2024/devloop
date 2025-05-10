#!/bin/bash
# Simple script to save a working state of the UI
# This is a manual alternative to the continuous backup system

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# UI directory
UI_DIR="/mnt/c/Users/angel/Devloop/ui"
BACKUP_DIR="$UI_DIR/backups/manual"

# Ensure we're in the UI directory
cd "$UI_DIR" || exit 1

# Create backup timestamp
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
BACKUP_PATH="$BACKUP_DIR/working-state-$TIMESTAMP"

# Create backup directory structure
mkdir -p "$BACKUP_PATH/src"

echo -e "${BLUE}Creating backup of current working state...${NC}"

# Copy key files for backup
cp -r src/* "$BACKUP_PATH/src/"
cp vite.config.js "$BACKUP_PATH/"

# Create a backup info file
cat > "$BACKUP_PATH/backup-info.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "description": "Manual working state backup",
  "files": [
    "src/**/*",
    "vite.config.js"
  ],
  "manual": true
}
EOF

echo -e "${GREEN}Backup created at: $BACKUP_PATH${NC}"
echo -e "${BLUE}To restore this backup, run:${NC}"
echo -e "${YELLOW}  ./restore-from-backup.sh $BACKUP_PATH${NC}"

# Create a simple list of recent backups for easy reference
mkdir -p "$BACKUP_DIR"
ls -lt "$BACKUP_DIR" | grep "working-state-" | head -5 > "$BACKUP_DIR/recent-backups.txt"

echo -e "${GREEN}Done!${NC}"