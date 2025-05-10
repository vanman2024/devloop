#!/bin/bash
# Component-specific rollback script
# This script creates backups of individual components and can restore them without affecting HMR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$SCRIPT_DIR"
COMPONENT_DIR="$UI_DIR/src/components/roadmap"
BACKUP_DIR="$UI_DIR/component-backups"

# Create backup directories if they don't exist
mkdir -p "$BACKUP_DIR"

# Function to display usage
show_usage() {
  echo "Usage: $0 [backup|restore] [component_name]"
  echo ""
  echo "Commands:"
  echo "  backup [component_name]  - Create a backup of the specified component"
  echo "  restore [component_name] - Restore the specified component from backup"
  echo "  list                    - List available backups"
  echo ""
  echo "Examples:"
  echo "  $0 backup FeatureDetailsModal"
  echo "  $0 restore FeatureDetailsModal"
  echo "  $0 list"
  exit 1
}

# Function to backup a component
backup_component() {
  local component="$1"
  local timestamp=$(date +%Y%m%d%H%M%S)
  local component_path="$COMPONENT_DIR/${component}.jsx"
  local backup_path="$BACKUP_DIR/${component}_${timestamp}.jsx"
  
  if [ ! -f "$component_path" ]; then
    echo "Error: Component file not found: $component_path"
    exit 1
  fi
  
  # Create the backup
  cp "$component_path" "$backup_path"
  
  if [ $? -eq 0 ]; then
    echo "✅ Backup created: ${component}_${timestamp}.jsx"
    echo "   Location: $backup_path"
  else
    echo "❌ Error: Failed to create backup"
    exit 1
  fi
}

# Function to restore a component
restore_component() {
  local component="$1"
  local component_path="$COMPONENT_DIR/${component}.jsx"
  
  # Find the most recent backup
  local latest_backup=$(find "$BACKUP_DIR" -name "${component}_*.jsx" -type f | sort | tail -n 1)
  
  if [ -z "$latest_backup" ]; then
    echo "Error: No backup found for component: $component"
    exit 1
  fi
  
  # Create a backup of the current version before restoring
  local timestamp=$(date +%Y%m%d%H%M%S)
  local pre_restore_backup="$BACKUP_DIR/${component}_pre_restore_${timestamp}.jsx"
  
  if [ -f "$component_path" ]; then
    cp "$component_path" "$pre_restore_backup"
    echo "📦 Current version backed up as: ${component}_pre_restore_${timestamp}.jsx"
  fi
  
  # Restore the backup
  cp "$latest_backup" "$component_path"
  
  if [ $? -eq 0 ]; then
    echo "✅ Restored component from: $(basename "$latest_backup")"
    echo "   Location: $component_path"
  else
    echo "❌ Error: Failed to restore backup"
    exit 1
  fi
}

# Function to list available backups
list_backups() {
  echo "Available component backups:"
  echo "----------------------------"
  
  local backups=$(find "$BACKUP_DIR" -name "*.jsx" -type f | sort)
  
  if [ -z "$backups" ]; then
    echo "No backups found."
    exit 0
  fi
  
  echo "$backups" | while read backup; do
    local filename=$(basename "$backup")
    local component=$(echo "$filename" | cut -d'_' -f1)
    local timestamp=$(echo "$filename" | sed -E 's/.*_([0-9]{14})\.jsx/\1/')
    local date_formatted=$(echo "$timestamp" | sed -E 's/([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/\1-\2-\3 \4:\5:\6/')
    
    echo "[$component] $date_formatted - $filename"
  done
}

# Main script logic
if [ $# -lt 1 ]; then
  show_usage
fi

case "$1" in
  backup)
    if [ $# -lt 2 ]; then
      echo "Error: Component name required for backup"
      show_usage
    fi
    backup_component "$2"
    ;;
  restore)
    if [ $# -lt 2 ]; then
      echo "Error: Component name required for restore"
      show_usage
    fi
    restore_component "$2"
    ;;
  list)
    list_backups
    ;;
  *)
    show_usage
    ;;
esac

exit 0