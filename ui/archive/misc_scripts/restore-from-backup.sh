#!/bin/bash
# Restore components from a backup
# Usage: ./restore-from-backup.sh [backup-id]

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKUP_DIR="$SCRIPT_DIR/backups"

# Ensure backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo -e "${RED}Error: Backup directory not found: $BACKUP_DIR${NC}"
  exit 1
fi

# Function to list available backups
list_backups() {
  echo -e "${BLUE}Available backups:${NC}"
  echo ""
  
  # Get all backup directories
  backup_dirs=($(find "$BACKUP_DIR" -maxdepth 1 -type d -name "working-state-backup-*" | sort -r))
  
  if [ ${#backup_dirs[@]} -eq 0 ]; then
    echo -e "${YELLOW}No backups found in $BACKUP_DIR${NC}"
    exit 0
  fi
  
  # Print table header
  printf "%-5s %-30s %-25s %s\n" "ID" "BACKUP" "DATE" "COMPONENTS"
  printf "%-5s %-30s %-25s %s\n" "---" "------" "----" "----------"
  
  # Print each backup with ID for selection
  for i in "${!backup_dirs[@]}"; do
    backup_dir="${backup_dirs[$i]}"
    backup_name=$(basename "$backup_dir")
    
    # Extract date from directory name
    date_part=$(echo "$backup_name" | sed 's/working-state-backup-//')
    formatted_date=$(echo "$date_part" | sed 's/-/ /1' | sed 's/-/:/g' | sed 's/T/ /')
    
    # Check if backup-info.json exists
    info_file="$backup_dir/backup-info.json"
    if [ -f "$info_file" ]; then
      # Count components
      component_count=$(grep -c '"components":' "$info_file")
    else
      component_count="Unknown"
    fi
    
    printf "%-5s %-30s %-25s %s\n" "$i" "$backup_name" "$formatted_date" "$component_count components"
  done
  
  return 0
}

# Function to restore from a backup
restore_backup() {
  backup_id="$1"
  
  # Get all backup directories
  backup_dirs=($(find "$BACKUP_DIR" -maxdepth 1 -type d -name "working-state-backup-*" | sort -r))
  
  if [ ${#backup_dirs[@]} -eq 0 ]; then
    echo -e "${YELLOW}No backups found in $BACKUP_DIR${NC}"
    exit 1
  fi
  
  # Check if backup ID is valid
  if ! [[ "$backup_id" =~ ^[0-9]+$ ]] || [ "$backup_id" -ge ${#backup_dirs[@]} ]; then
    echo -e "${RED}Error: Invalid backup ID: $backup_id${NC}"
    echo "Please choose from the following backups:"
    list_backups
    exit 1
  fi
  
  backup_dir="${backup_dirs[$backup_id]}"
  backup_name=$(basename "$backup_dir")
  
  echo -e "${BLUE}Restoring from backup: $backup_name${NC}"
  
  # Check if info file exists
  info_file="$backup_dir/backup-info.json"
  if [ ! -f "$info_file" ]; then
    echo -e "${RED}Error: Backup info file not found: $info_file${NC}"
    exit 1
  fi
  
  # Create backup of current state before restoring
  timestamp=$(date +%Y%m%d%H%M%S)
  current_backup_dir="$BACKUP_DIR/pre-restore-backup-$timestamp"
  
  echo -e "${BLUE}Creating backup of current state: $(basename "$current_backup_dir")${NC}"
  mkdir -p "$current_backup_dir"
  
  # Extract components from backup info file
  components=$(grep -o '"components":\s*\[[^]]*\]' "$info_file" | sed 's/"components":\s*\[\|\]//g' | sed 's/"//g' | sed 's/,/ /g')
  
  # Backup current state of components
  for component in $components; do
    component_path="$SCRIPT_DIR/$component"
    
    if [ -f "$component_path" ]; then
      # Create directory structure in backup
      target_dir="$current_backup_dir/$(dirname "$component")"
      mkdir -p "$target_dir"
      
      # Copy file to backup
      cp "$component_path" "$target_dir/"
      echo -e "  - Backed up current state of $component"
    fi
  done
  
  # Now restore from the selected backup
  for component in $components; do
    backup_file="$backup_dir/$component"
    target_file="$SCRIPT_DIR/$component"
    
    if [ -f "$backup_file" ]; then
      # Create target directory if it doesn't exist
      target_dir=$(dirname "$target_file")
      mkdir -p "$target_dir"
      
      # Copy file from backup to target
      cp "$backup_file" "$target_file"
      echo -e "  - Restored $component"
    else
      echo -e "${YELLOW}Warning: Component not found in backup: $component${NC}"
    fi
  done
  
  echo -e "${GREEN}Restoration completed successfully!${NC}"
  echo -e "${BLUE}If you need to undo this restoration, you can restore from: $(basename "$current_backup_dir")${NC}"
  
  return 0
}

# Main script

# Check if a specific backup ID was provided
if [ $# -eq 1 ]; then
  restore_backup "$1"
  exit 0
fi

# If no arguments or invalid number of arguments, display available backups and ask for selection
if [ $# -ne 1 ]; then
  list_backups
  
  echo ""
  echo -e "${YELLOW}Enter backup ID to restore, or Ctrl+C to cancel:${NC}"
  read -p "> " selected_id
  
  # Make sure we got valid input
  if [ -z "$selected_id" ]; then
    echo -e "${RED}No backup ID provided. Exiting.${NC}"
    exit 1
  fi
  
  restore_backup "$selected_id"
  exit 0
fi